import type { AgentTimelineEvent, AuditLogEntry, EvidenceReviewPacket, ImpactMap, ProjectBrainFact, ProjectBrainSnapshot, PullRequestDraft, RepoIntelligenceSummary, TaskCapsule } from '@agentforge/core';

export interface WorkspaceViewModel {
  projectName: string;
  brainStatus: 'Not scanned' | 'Scanning' | 'Synced' | 'Stale';
  risk: ImpactMap['risk']['level'];
  facts: ProjectBrainFact[];
  task?: TaskCapsule;
  reviewPacket?: EvidenceReviewPacket;
  pullRequestDraft?: PullRequestDraft;
  logs: string[];
  repo?: RepoIntelligenceSummary;
  timeline?: AgentTimelineEvent[];
  audit?: AuditLogEntry[];
  brain?: ProjectBrainSnapshot;
}

export function renderAgentForgeWorkspace(model: WorkspaceViewModel): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AgentForge Workspace</title>
  <style>${styles()}</style>
</head>
<body>
  <main class="shell">
    <header class="topbar">
      <strong>AgentForge</strong>
      <span>Project: ${escapeHtml(model.projectName)}</span>
      <span>Brain: ${model.brainStatus}</span>
      <span>Risk: ${model.risk}</span>
    </header>
    <section class="grid">
      <aside class="project pane">
        <h2>Project</h2>
        ${navList(['Files', 'Brain', 'Contracts', 'Tasks', 'PRs'])}
      </aside>
      <section class="workspace pane">
        <h2>Workspace</h2>
        ${renderCurrentTask(model.task)}
        ${renderReviewPacket(model.reviewPacket)}
        ${renderPullRequestDraft(model.pullRequestDraft)}
        ${renderTaskActions()}
      </section>
      <aside class="intelligence pane">
        <h2>Intelligence</h2>
        ${navList(['Project Brain', 'Impact Guard', 'Agent Timeline', 'Context Lease', 'Test Evidence'])}
        ${renderImpactMap(model.task?.impactMap)}
        ${renderLeases(model.task)}
        ${renderTimeline(model.timeline ?? [])}
        ${renderContractGraph(model.repo)}
        ${renderMemoryGovernance(model.brain)}
        <h3>Brain Facts</h3>
        <ul>${model.facts.slice(0, 8).map((fact) => `<li><strong>${escapeHtml(fact.factId)}</strong><br/>${escapeHtml(fact.statement)}</li>`).join('')}</ul>
      </aside>
    </section>
    <footer class="bottom pane">
      <strong>Terminal | Tests | Logs | Git | Sandbox</strong>
      ${renderRepoSummary(model.repo)}
      ${renderAudit(model.audit ?? [])}
      <pre>${escapeHtml(model.logs.join('\n'))}</pre>
    </footer>
  </main>
</body>
</html>`;
}




function renderContractGraph(repo?: RepoIntelligenceSummary): string {
  if (!repo) return '<section><h3>Contract Graph</h3><p class="muted">No Contract Graph available yet.</p></section>';
  return `<section><h3>Contract Graph</h3><p>${repo.contractGraph.contracts.length} contract(s), ${repo.contractGraph.consumers.length} consumer edge(s).</p></section>`;
}

function renderMemoryGovernance(brain?: ProjectBrainSnapshot): string {
  if (!brain) return '<section><h3>Memory Governance</h3><p class="muted">No Project Brain governance snapshot yet.</p></section>';
  return `<section><h3>Memory Governance</h3><p>${brain.staleFactIds.length} stale fact(s), ${brain.candidates.filter((candidate) => candidate.status === 'pending').length} pending candidate(s), ${brain.conflicts.length} conflict(s).</p></section>`;
}

function renderImpactMap(impact?: ImpactMap): string {
  if (!impact) return '<section><h3>Impact Guard</h3><p class="muted">Impact Map will appear before code changes.</p></section>';
  return `<section><h3>Impact Guard</h3><p>Target: ${escapeHtml(impact.changeTarget.module)}</p><p>Risk: <strong>${impact.risk.level}</strong></p><p>Verification: ${impact.requiredVerification.map(escapeHtml).join(', ') || 'None detected'}</p></section>`;
}

function renderLeases(task?: TaskCapsule): string {
  if (!task) return '<section><h3>Context Lease</h3><p class="muted">No leases granted yet.</p></section>';
  return `<section><h3>Context Lease</h3><ul>${task.leases.map((lease) => `<li>${escapeHtml(lease.leaseId)} → ${escapeHtml(String(lease.agent))}: write ${lease.canWrite.map(escapeHtml).join(', ')}</li>`).join('')}</ul></section>`;
}

function renderTimeline(events: AgentTimelineEvent[]): string {
  return `<section><h3>Agent Timeline</h3><ol>${events.map((event) => `<li>${escapeHtml(event.timestamp)} — ${escapeHtml(event.event)}</li>`).join('')}</ol></section>`;
}

function renderTaskActions(): string {
  return '<section><h3>Safe Apply</h3><button>Apply</button><button>Revise</button><button>Create PR</button><button>Discard</button></section>';
}

function renderRepoSummary(repo?: RepoIntelligenceSummary): string {
  if (!repo) return '';
  return `<p>Repo Intelligence: ${repo.modules.length} modules, ${repo.publicContracts.length} public contracts, ${repo.testCommands.length} test commands, confidence ${repo.confidenceScore}%.</p>`;
}

function renderAudit(entries: AuditLogEntry[]): string {
  if (entries.length === 0) return '<p class="muted">Audit Log: no governed tool calls yet.</p>';
  return `<p>Audit Log: ${entries.length} governed event(s).</p>`;
}


function renderPullRequestDraft(draft?: PullRequestDraft): string {
  if (!draft) return '<section><h3>PR Integration</h3><p class="muted">Create PR will attach the Evidence Review Packet.</p></section>';
  return `<section><h3>PR Integration</h3><p>${escapeHtml(draft.provider)}: ${escapeHtml(draft.title)}</p><p>Labels: ${draft.labels.map(escapeHtml).join(', ')}</p></section>`;
}

function renderCurrentTask(task?: TaskCapsule): string {
  if (!task) return '<p class="muted">Enter a development goal to start Understand → Change → Prove.</p>';
  return `<article>
    <h3>Goal</h3><p>${escapeHtml(task.goal)}</p>
    <h3>Spec / Plan</h3><ol>${task.plan.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ol>
    <h3>Impact Guard</h3><p>Risk: <strong>${task.impactMap.risk.level}</strong></p>
    <ul>${task.impactMap.risk.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join('')}</ul>
  </article>`;
}

function renderReviewPacket(packet?: EvidenceReviewPacket): string {
  if (!packet) return '<section><h3>Review Packet</h3><p class="muted">Evidence Review will appear after verification.</p></section>';
  return `<section><h3>Review Packet</h3><p>${escapeHtml(packet.result)}</p><ul>${packet.changedFiles.map((file) => `<li>${escapeHtml(file.file)} — ${escapeHtml(file.intent)}</li>`).join('')}</ul></section>`;
}

function navList(items: string[]): string {
  return `<nav>${items.map((item) => `<button>${escapeHtml(item)}</button>`).join('')}</nav>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char] ?? char);
}

function styles(): string {
  return `body{margin:0;background:#0f172a;color:#e5e7eb;font-family:Inter,system-ui,sans-serif}.shell{min-height:100vh;display:flex;flex-direction:column}.topbar{height:52px;display:flex;align-items:center;gap:24px;padding:0 20px;border-bottom:1px solid #334155;background:#111827}.grid{flex:1;display:grid;grid-template-columns:240px 1fr 320px;min-height:0}.pane{border-color:#334155;background:#111827cc}.project{border-right:1px solid #334155}.intelligence{border-left:1px solid #334155}.workspace{padding:20px;overflow:auto}.project,.intelligence{padding:16px;overflow:auto}.bottom{height:160px;border-top:1px solid #334155;padding:12px 20px;overflow:auto}button{display:block;width:100%;margin:8px 0;padding:10px;border:1px solid #334155;border-radius:8px;background:#1f2937;color:#e5e7eb;text-align:left}.muted{color:#94a3b8}pre{white-space:pre-wrap;color:#cbd5e1}`;
}
