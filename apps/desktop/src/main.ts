import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { TaskSession } from '@agentforge/runtime';
import { renderAgentForgeWorkspace } from '@agentforge/ui';

export async function bootstrapAgentForgeWorkspace(rootPath?: string): Promise<string> {
  const workspaceRoot = await findRepositoryRoot(rootPath ?? process.env.AGENTFORGE_REPO_ROOT ?? process.cwd());
  const session = new TaskSession();
  const snapshot = await session.start({
    rootPath: workspaceRoot,
    taskId: 'MVP-001',
    goal: 'Initialize AgentForge Workspace shell from PRD-defined MVP scope',
    targetFiles: ['README.md']
  });
  const html = renderAgentForgeWorkspace({
    projectName: workspaceRoot.split('/').filter(Boolean).pop() ?? 'AgentForge',
    brainStatus: 'Synced',
    risk: snapshot.task.impactMap.risk.level,
    facts: snapshot.repo.facts,
    repo: snapshot.repo,
    task: snapshot.task,
    reviewPacket: snapshot.reviewPacket,
    pullRequestDraft: snapshot.pullRequestDraft,
    timeline: snapshot.timeline,
    audit: snapshot.audit,
    brain: snapshot.brain,
    logs: snapshot.timeline.map((event) => `${event.timestamp} ${event.event}`)
  });
  const outDir = resolve(workspaceRoot, 'apps/desktop/dist');
  await mkdir(outDir, { recursive: true });
  const outFile = resolve(outDir, 'workspace.html');
  await writeFile(outFile, html, 'utf8');
  return outFile;
}

async function findRepositoryRoot(startPath: string): Promise<string> {
  let current = resolve(startPath);
  for (;;) {
    try {
      await readFile(resolve(current, 'docs/agentforge-product-prd.md'), 'utf8');
      return current;
    } catch {
      const parent = dirname(current);
      if (parent === current) return resolve(startPath);
      current = parent;
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outFile = await bootstrapAgentForgeWorkspace();
  console.log(`AgentForge Workspace generated: ${outFile}`);
}
