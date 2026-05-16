import test from 'node:test';
import assert from 'node:assert/strict';
import { generateImpactMap, buildEvidenceReviewPacket } from '../packages/core/dist/index.js';
import { createContextLease, leaseAllowsFile } from '../packages/runtime/dist/index.js';

test('Impact Guard flags auth changes as high risk and preserves verification', () => {
  const map = generateImpactMap({
    goal: 'Fix refresh token silent failure',
    targetFiles: ['packages/auth-client/src/interceptor.ts'],
    knownModules: ['packages/auth-client', 'apps/web', 'apps/admin'],
    publicContracts: ['packages/auth-client/src/index.ts'],
    testCommands: ['pnpm --filter auth-client test', 'pnpm --filter web test auth'],
    highRiskAreas: ['packages/auth-client']
  });

  assert.equal(map.risk.level, 'high');
  assert.equal(map.changeTarget.module, 'packages/auth-client');
  assert.ok(map.requiredVerification.some((command) => command.includes('auth-client')));
});

test('Context Lease allows scoped writes and blocks out-of-scope files', () => {
  const lease = createContextLease({
    agent: 'coder',
    taskId: 'AUTH-042',
    canRead: ['packages/auth-client/**'],
    canWrite: ['packages/auth-client/src/interceptor.ts'],
    canUseFacts: [],
    tools: ['read_file', 'edit_file'],
    requiresApprovalFor: ['database/**']
  });

  assert.equal(leaseAllowsFile(lease, 'packages/auth-client/src/interceptor.ts', 'write'), true);
  assert.equal(leaseAllowsFile(lease, 'apps/web/src/api/client.ts', 'write'), false);
});

test('Evidence Review Packet reports out-of-scope files', () => {
  const impact = generateImpactMap({
    goal: 'Update shared type',
    targetFiles: ['packages/shared/src/types.ts'],
    knownModules: ['packages/shared', 'apps/web'],
    publicContracts: ['packages/shared/src/types.ts'],
    testCommands: ['pnpm test'],
    highRiskAreas: []
  });
  const packet = buildEvidenceReviewPacket({
    taskId: 'T-001',
    goal: 'Update shared type',
    result: 'Updated type and web usage',
    impact,
    actualFiles: ['packages/shared/src/types.ts', 'apps/web/src/profile.ts'],
    verification: [{ command: 'pnpm test', status: 'passed', summary: 'All tests passed' }]
  });

  assert.deepEqual(packet.plannedImpactVsActual.outOfScopeFiles, ['apps/web/src/profile.ts']);
  assert.ok(packet.reviewerFocus.some((focus) => focus.includes('out-of-scope')));
});

test('TaskSession produces Understand → Prove snapshot with timeline and audit', async () => {
  const { TaskSession } = await import('../packages/runtime/dist/index.js');
  const session = new TaskSession();
  const snapshot = await session.start({
    rootPath: process.cwd(),
    taskId: 'MVP-SESSION',
    goal: 'Preview governed task session',
    targetFiles: ['README.md'],
    verification: [{ command: 'pnpm test', status: 'passed', summary: 'Session test injected verification' }]
  });

  assert.equal(snapshot.status, 'ready_for_review');
  assert.ok(snapshot.timeline.some((event) => event.event === 'project_brain_scanned'));
  assert.ok(snapshot.timeline.some((event) => event.event === 'ready_for_review'));
  assert.ok(snapshot.audit.some((entry) => entry.action === 'lease_granted'));
  assert.equal(snapshot.reviewPacket.verification[0].status, 'passed');
});

test('ToolRegistry records governed tool-call audit entries', async () => {
  const { ToolRegistry } = await import('../packages/tools/dist/index.js');
  const { AuditLog, createContextLease } = await import('../packages/runtime/dist/index.js');
  const registry = new ToolRegistry();
  registry.register('echo', 'run_shell', async () => ({ tool: 'run_shell', status: 'ok', data: { value: 'ok' } }));
  const auditLog = new AuditLog();
  const lease = createContextLease({
    agent: 'tester',
    taskId: 'TOOL-001',
    canRead: ['README.md'],
    canWrite: [],
    canUseFacts: [],
    tools: ['run_shell'],
    requiresApprovalFor: []
  });

  const result = await registry.call('echo', {}, { taskId: 'TOOL-001', agentId: 'tester-agent', lease, auditLog });
  assert.equal(result.status, 'ok');
  const entries = auditLog.list({ taskId: 'TOOL-001' });
  assert.equal(entries.length, 1);
  assert.equal(entries[0].action, 'tool_call');
});

test('ChangeManager applies patches and rolls back from checkpoint', async () => {
  const { mkdtemp, readFile, rm, writeFile } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { ChangeManager, AuditLog, createContextLease } = await import('../packages/runtime/dist/index.js');

  const root = await mkdtemp(join(tmpdir(), 'agentforge-change-'));
  try {
    await writeFile(join(root, 'README.md'), 'before', 'utf8');
    const auditLog = new AuditLog();
    const manager = new ChangeManager({ rootPath: root, auditLog });
    const lease = createContextLease({
      agent: 'coder',
      taskId: 'SAFE-001',
      canRead: ['README.md'],
      canWrite: ['README.md'],
      canUseFacts: [],
      tools: ['edit_file'],
      requiresApprovalFor: []
    });
    const changeSet = {
      changeSetId: 'cs_1',
      taskId: 'SAFE-001',
      createdAt: new Date().toISOString(),
      patches: [{ file: 'README.md', before: 'before', after: 'after', intent: 'verify safe apply' }]
    };

    const result = await manager.applyChangeSet({ changeSet, lease, agentId: 'coder-agent', decision: { action: 'apply' } });
    assert.deepEqual(result.appliedFiles, ['README.md']);
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), 'after');
    assert.ok(auditLog.list({ taskId: 'SAFE-001' }).some((entry) => entry.action === 'checkpoint_created'));
    assert.ok(auditLog.list({ taskId: 'SAFE-001' }).some((entry) => entry.action === 'changes_applied'));

    await manager.rollback(result.checkpoint.checkpointId, 'coder-agent');
    assert.equal(await readFile(join(root, 'README.md'), 'utf8'), 'before');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ChangeManager blocks out-of-lease patch application', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { ChangeManager, createContextLease } = await import('../packages/runtime/dist/index.js');

  const root = await mkdtemp(join(tmpdir(), 'agentforge-lease-'));
  try {
    const manager = new ChangeManager({ rootPath: root });
    const lease = createContextLease({
      agent: 'coder',
      taskId: 'SAFE-002',
      canRead: ['README.md'],
      canWrite: ['README.md'],
      canUseFacts: [],
      tools: ['edit_file'],
      requiresApprovalFor: []
    });
    const changeSet = {
      changeSetId: 'cs_2',
      taskId: 'SAFE-002',
      createdAt: new Date().toISOString(),
      patches: [{ file: 'package.json', after: '{}', intent: 'should be blocked' }]
    };

    await assert.rejects(
      manager.applyChangeSet({ changeSet, lease, agentId: 'coder-agent', decision: { action: 'apply' } }),
      /does not allow write access/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('ProjectBrainFactStore gates agent memory through candidate approval', async () => {
  const { ProjectBrainFactStore } = await import('../packages/core/dist/index.js');
  const store = new ProjectBrainFactStore();
  const candidate = store.proposeCandidate({
    factId: 'auth.refresh-token.interceptor',
    type: 'behavior_contract',
    statement: 'Refresh token handling is centralized in auth-client interceptor.',
    scope: { modules: ['packages/auth-client'], files: ['packages/auth-client/src/interceptor.ts'] },
    evidence: { source: 'agent_candidate', files: ['packages/auth-client/src/interceptor.ts'] },
    confidence: 'high',
    validatedBy: [],
    expiresWhen: ['packages/auth-client/src/interceptor.ts changes']
  }, 'doc-agent', 'Generated after task completion');

  assert.equal(candidate.status, 'pending');
  assert.equal(candidate.fact.confidence, 'medium');
  assert.equal(candidate.fact.evidence.source, 'agent_candidate');

  const approved = store.approveCandidate(candidate.candidateId, 'tech-lead');
  assert.equal(approved.confidence, 'high');
  assert.equal(approved.evidence.source, 'human');
  assert.ok(approved.validatedBy.includes('tech-lead'));
  assert.equal(store.snapshot().facts.length, 1);
});

test('ProjectBrainFactStore stales facts and reports conflicts', async () => {
  const { ProjectBrainFactStore } = await import('../packages/core/dist/index.js');
  const initialFact = {
    factId: 'module.auth',
    type: 'module_boundary',
    statement: 'Auth module exists.',
    scope: { modules: ['packages/auth-client'], files: ['packages/auth-client'] },
    evidence: { source: 'code', files: ['packages/auth-client'] },
    confidence: 'high',
    validatedBy: ['pnpm test'],
    expiresWhen: ['packages/auth-client/src/interceptor.ts changes']
  };
  const store = new ProjectBrainFactStore([initialFact]);
  const stale = store.markChangedFiles(['packages/auth-client/src/interceptor.ts']);
  assert.deepEqual(stale.map((fact) => fact.factId), ['module.auth']);
  assert.equal(store.getFact('module.auth').confidence, 'stale');

  const conflicts = store.ingestValidatedFacts([{ ...initialFact, statement: 'Auth module has a different boundary.' }]);
  assert.equal(conflicts.length, 1);
  assert.equal(store.snapshot().conflicts[0].factId, 'module.auth');
});

test('Contract Graph maps public contracts to consumers and Impact Guard uses it', async () => {
  const { buildContractGraph, generateImpactMap } = await import('../packages/core/dist/index.js');
  const graph = buildContractGraph({
    modules: ['packages/auth-client', 'apps/web', 'apps/admin'],
    publicContracts: ['packages/auth-client/src/index.ts'],
    files: ['apps/web/src/auth-client.ts', 'apps/admin/src/auth-client.ts']
  });

  assert.equal(graph.contracts.length, 1);
  assert.equal(graph.contracts[0].ownerModule, 'packages/auth-client');
  assert.ok(graph.consumers.some((edge) => edge.consumerModule === 'apps/web'));

  const map = generateImpactMap({
    goal: 'Change auth public API',
    targetFiles: ['packages/auth-client/src/index.ts'],
    knownModules: ['packages/auth-client', 'apps/web', 'apps/admin'],
    publicContracts: ['packages/auth-client/src/index.ts'],
    contractGraph: graph,
    testCommands: ['pnpm --filter auth-client test'],
    highRiskAreas: []
  });

  assert.equal(map.contractsTouched[0].contractId, graph.contracts[0].contractId);
  assert.ok(map.contractsTouched[0].consumers.includes('apps/web'));
});

test('Repository scan includes Contract Graph in Repo Intelligence', async () => {
  const { scanRepository } = await import('../packages/core/dist/index.js');
  const repo = await scanRepository(process.cwd(), { maxFiles: 2000 });
  assert.ok(Array.isArray(repo.contractGraph.contracts));
  assert.ok(Array.isArray(repo.contractGraph.consumers));
});

test('Organization Policy blocks secrets and flags approval-required files', async () => {
  const { DEFAULT_ORGANIZATION_POLICY, evaluateFileRead, evaluateFileWrite, evaluateCommand } = await import('../packages/core/dist/index.js');

  assert.equal(evaluateFileRead(DEFAULT_ORGANIZATION_POLICY, '.env').status, 'deny');
  assert.equal(evaluateFileWrite(DEFAULT_ORGANIZATION_POLICY, 'services/api/database/schema.sql').status, 'approval_required');
  assert.equal(evaluateCommand(DEFAULT_ORGANIZATION_POLICY, 'python scripts/build.py').status, 'deny');
  assert.equal(evaluateCommand(DEFAULT_ORGANIZATION_POLICY, 'pnpm test').status, 'allow');
});

test('ToolRegistry enforces organization policy tool allowlist', async () => {
  const { ToolRegistry } = await import('../packages/tools/dist/index.js');
  const { createContextLease } = await import('../packages/runtime/dist/index.js');
  const { DEFAULT_ORGANIZATION_POLICY, mergePolicy } = await import('../packages/core/dist/index.js');
  const registry = new ToolRegistry();
  registry.register('shell', 'run_shell', async () => ({ tool: 'run_shell', status: 'ok' }));
  const lease = createContextLease({
    agent: 'tester',
    taskId: 'POLICY-001',
    canRead: ['README.md'],
    canWrite: [],
    canUseFacts: [],
    tools: ['run_shell'],
    requiresApprovalFor: []
  });
  const policy = mergePolicy(DEFAULT_ORGANIZATION_POLICY, { toolAllowlist: ['read_file'] });

  const result = await registry.call('shell', {}, { taskId: 'POLICY-001', agentId: 'tester-agent', lease, policy });
  assert.equal(result.status, 'error');
  assert.match(result.error, /not allowed/);
});

test('ChangeManager enforces compliance policy even when lease allows file', async () => {
  const { mkdtemp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { ChangeManager, createContextLease } = await import('../packages/runtime/dist/index.js');

  const root = await mkdtemp(join(tmpdir(), 'agentforge-policy-'));
  try {
    const manager = new ChangeManager({ rootPath: root });
    const lease = createContextLease({
      agent: 'coder',
      taskId: 'POLICY-002',
      canRead: ['**'],
      canWrite: ['**'],
      canUseFacts: [],
      tools: ['edit_file'],
      requiresApprovalFor: []
    });
    const changeSet = {
      changeSetId: 'cs_policy',
      taskId: 'POLICY-002',
      createdAt: new Date().toISOString(),
      patches: [{ file: '.env', after: 'SECRET=value', intent: 'should be blocked by compliance policy' }]
    };

    await assert.rejects(
      manager.applyChangeSet({ changeSet, lease, agentId: 'coder-agent', decision: { action: 'apply' } }),
      /forbids write access/
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('PR draft attaches Evidence Review Packet and merge labels', async () => {
  const { buildPullRequestDraft, buildEvidenceReviewPacket, generateImpactMap } = await import('../packages/core/dist/index.js');
  const impact = generateImpactMap({
    goal: 'Update public auth API',
    targetFiles: ['packages/auth-client/src/index.ts'],
    knownModules: ['packages/auth-client', 'apps/web'],
    publicContracts: ['packages/auth-client/src/index.ts'],
    testCommands: ['pnpm test'],
    highRiskAreas: []
  });
  const packet = buildEvidenceReviewPacket({
    taskId: 'PR-001',
    goal: 'Update public auth API',
    result: 'Prepared API update',
    impact,
    actualFiles: ['packages/auth-client/src/index.ts'],
    verification: [{ command: 'pnpm test', status: 'passed', summary: 'Tests passed' }]
  });
  const draft = buildPullRequestDraft({ provider: 'github', baseBranch: 'main', headBranch: 'agentforge/pr-001', packet });

  assert.equal(draft.title, '[PR-001] Update public auth API');
  assert.ok(draft.body.includes('AgentForge Evidence Review'));
  assert.ok(draft.labels.includes('agentforge'));
  assert.equal(draft.reviewPacket.taskId, 'PR-001');
});

test('CI checks merge into Evidence Review verification and delivery package', async () => {
  const { buildDeliveryPackage, buildPullRequestDraft, buildEvidenceReviewPacket, generateImpactMap, mergeCiIntoReviewPacket } = await import('../packages/core/dist/index.js');
  const impact = generateImpactMap({
    goal: 'Update docs',
    targetFiles: ['README.md'],
    knownModules: ['.'],
    publicContracts: [],
    testCommands: ['pnpm test'],
    highRiskAreas: []
  });
  const packet = buildEvidenceReviewPacket({ taskId: 'CI-001', goal: 'Update docs', result: 'Docs updated', impact, actualFiles: ['README.md'], verification: [] });
  const checks = [{ provider: 'github', checkName: 'unit-tests', command: 'pnpm test', status: 'passed', summary: 'CI passed', url: 'https://ci.example/1' }];
  const updated = mergeCiIntoReviewPacket(packet, checks);
  const pr = buildPullRequestDraft({ provider: 'github', baseBranch: 'main', headBranch: 'agentforge/ci-001', packet: updated });
  const delivery = buildDeliveryPackage(pr, checks);

  assert.equal(updated.verification[0].status, 'passed');
  assert.equal(updated.verification[0].logRef, 'https://ci.example/1');
  assert.equal(delivery.taskId, 'CI-001');
  assert.equal(delivery.ciChecks.length, 1);
});

test('TaskSession creates PR draft for ready-for-review tasks', async () => {
  const { TaskSession } = await import('../packages/runtime/dist/index.js');
  const session = new TaskSession();
  const snapshot = await session.start({ rootPath: process.cwd(), taskId: 'PR-SESSION', goal: 'Prepare PR draft', targetFiles: ['README.md'] });
  assert.equal(snapshot.pullRequestDraft.provider, 'github');
  assert.ok(snapshot.pullRequestDraft.body.includes('Evidence Review'));
});
