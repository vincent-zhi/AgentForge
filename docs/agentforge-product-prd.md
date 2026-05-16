# AgentForge Product Requirements Document

## 1. Product Definition

**Product codename:** AgentForge

**Product category:** Agentic Coding Desktop / Agentic Engineering Workspace

**Positioning:** AgentForge is an AI development workspace for real engineering projects. It is not a chat-style AI coding assistant and should not be presented as a collection of separate modes such as Ask, Pair, Quest, Team, Review, or Builder. It is a unified desktop workspace with Shared Project Brain, Impact Guard, and a governed multi-agent execution system.

**One-line value proposition:** Let AI do more than edit code: make it understand the project, assess impact, control change, verify results, and deliver merge-ready code like a senior engineering team.

**Commercial headline:** The AI coding workspace that understands your whole codebase before changing it.

**Chinese product claim:** 每次改代码前，先知道会影响哪里；每次交付代码后，都能证明为什么可以合并。

**Core product belief:** Do not let AI blindly modify a codebase. Make it understand first, change second, and prove last.

## 2. Product Principles

1. **One workspace, not many modes.** Users should not choose between Ask Mode, Quest Mode, Review Mode, Builder Mode, or Team Mode. The product should expose one continuous AgentForge Workspace.
2. **Tasks begin with understanding.** AgentForge must inspect project facts, contracts, dependencies, and risk before authorizing code changes.
3. **Project understanding belongs to the system.** Project intelligence should be shared, evidence-backed, and reusable across agents, sessions, and team members.
4. **Agents are governed, not unleashed.** Multi-agent execution must be scoped, permissioned, auditable, and reversible.
5. **Every delivery needs evidence.** The final deliverable is not only a diff; it is a review packet containing impact, verification, risks, and reviewer focus.
6. **Commercial trust beats raw code generation speed.** AgentForge wins by reducing AI-change risk and review uncertainty in real codebases.
7. **Coding-tool parity is table stakes.** AgentForge must be as usable as leading agentic coding tools for day-to-day coding, background execution, tool calls, terminal work, repository navigation, diff application, and autonomous implementation. Project Brain and Impact Guard are differentiators, but they cannot compensate for a weak coding experience.

## 3. Target Users and Buyers

### 3.1 Primary Users

- Professional software engineers working in medium-to-large repositories.
- Tech leads responsible for reviewing AI-generated changes.
- Staff engineers and architects who care about contracts, boundaries, and regression risk.
- AI-native engineering teams that want autonomous coding but need reviewable evidence.

### 3.2 Economic Buyers

- Engineering managers seeking faster delivery with controlled risk.
- Platform engineering teams standardizing AI development workflows.
- CTOs and VPs of Engineering concerned about AI coding governance, auditability, and compliance.

### 3.3 Market Segments

| Segment | Offering | Primary Value |
| --- | --- | --- |
| Individual developers | Free / Pro | Local productivity, project understanding, safe code changes |
| Small teams | Team | Shared Project Brain, PR integration, review workflow |
| Enterprise engineering organizations | Enterprise | SSO, permissions, audit logs, policy, compliance, private deployment |
| AI-native companies | Platform | Model routing, governance, automation, integration extensibility |

## 4. Product Experience Model

AgentForge exposes one central product surface:

```text
AgentForge Workspace
```

The workspace contains three natural task phases, not user-selected modes:

```text
Understand → Change → Prove
理解 → 修改 → 证明
```

### 4.1 Unified User Journey

```text
User enters development goal
↓
AgentForge understands the project
↓
AgentForge generates an Impact Map and execution plan
↓
AgentForge assigns scoped work to governed agents
↓
AgentForge changes code within approved boundaries
↓
AgentForge runs affected verification
↓
AgentForge produces an Evidence Review Packet
↓
User chooses Apply / Revise / Create PR / Discard
```

### 4.2 User Mental Model

Users should only need to think:

> I give AgentForge a development goal. It understands the project, analyzes impact, organizes agents, changes code, runs verification, and generates a reviewable delivery package.

### 4.3 Execution Depth

AgentForge automatically determines task depth based on goal, risk, repository signals, and organization policy. It may treat an input as a question, local edit, cross-module change, refactor, UI implementation, PR review, or high-risk change, but these are internal execution classifications and should not become top-level UI modes.

## 5. Core Systems

AgentForge is built around five product systems:

1. **Shared Project Brain** — shared project intelligence.
2. **Impact Guard** — change impact protection.
3. **Governed Agent Runtime** — controlled multi-agent execution.
4. **Evidence Pipeline** — evidence-based execution and verification.
5. **Commercial Delivery Layer** — team delivery, review, permissions, and metrics.

These systems form the end-to-end commercial loop: understand the codebase, map risk, constrain agents, verify outcomes, and deliver auditable work.

## 6. Shared Project Brain

### 6.1 Objective

Shared Project Brain is the foundation of AgentForge. It maintains a living, evidence-backed model of the project so every agent and workflow uses the same project understanding.

### 6.2 Problem

Most coding agents repeatedly inspect the repository from scratch. Subagents often build inconsistent mental models, duplicate exploration work, and forget project-specific constraints. Long-term memory can also become polluted when agent-generated summaries are treated as facts.

### 6.3 Product Requirement

AgentForge must maintain a persistent Project Brain containing engineering facts such as:

- Code structure.
- Module boundaries.
- Dependency relationships.
- Call chains.
- Public APIs.
- Type contracts.
- Database schemas.
- Configuration entry points.
- Test mappings.
- CI commands.
- Dangerous directories.
- Historical architecture decisions.
- Historical PR decisions.
- Team conventions.
- Common incidents.
- Known agent mistake patterns.

### 6.4 Fact Model

Every Project Brain fact must have evidence, scope, confidence, and invalidation rules.

```yaml
fact_id: auth.refresh-token.interceptor
type: behavior_contract
statement: "Frontend 401 and refresh-token handling is centralized in the auth-client interceptor"
scope:
  modules:
    - packages/auth-client
    - apps/web
evidence:
  source: code
  files:
    - packages/auth-client/src/interceptor.ts
    - apps/web/src/api/client.ts
  commit: 9f31c2a
confidence: high
validated_by:
  - pnpm --filter auth-client test
expires_when:
  - packages/auth-client/src/interceptor.ts changes
  - apps/web/src/api/client.ts changes
```

### 6.5 Fact Governance

AgentForge must enforce the following rules:

- Agents cannot freely write their own summaries into Project Brain as high-confidence facts.
- High-confidence facts must come from code, tests, PRs, CI, or human confirmation.
- When related files change, dependent facts must be downgraded, marked stale, or expired.
- Conflicting facts must be surfaced for review instead of silently merged.
- Memory updates should be proposed as candidates before becoming trusted team facts.

### 6.6 Initial Repository Scan

When opening a project, AgentForge should:

1. Scan repository structure.
2. Identify package boundaries and modules.
3. Detect dependency graphs and import relationships.
4. Detect tests and likely test commands.
5. Detect public contracts, schemas, and API entry points.
6. Detect high-risk areas such as auth, payment, migrations, CI, deployment, and secrets.
7. Produce Repo Intelligence with confidence levels.

Example user-facing summary:

```text
Modules: 23
Public contracts: 48
Test commands: 17
High-risk areas: auth, payment, migration, ci
Project Brain confidence: 82%
```

### 6.7 Acceptance Criteria

- AgentForge can display Project Brain facts with source evidence.
- AgentForge can mark facts as stale when referenced files change.
- AgentForge can distinguish system-validated facts from agent-generated candidates.
- Agents can request and use relevant Project Brain facts during task execution.
- Users can review, approve, reject, or edit memory update candidates.

## 7. Impact Guard

### 7.1 Objective

Impact Guard is the primary commercial differentiator of AgentForge. It ensures AgentForge understands what a change may affect before any agent modifies code.

### 7.2 Problem

Typical coding agents find files related to the requested change, edit them, and run limited tests. They often miss downstream callers, contracts, compatibility requirements, and forbidden change zones.

### 7.3 Required Behavior

For every meaningful code-change task, AgentForge must determine:

- What the target depends on.
- What depends on the target.
- What public or implicit contracts may be touched.
- Which modules impose constraints on the target.
- Which callers may break.
- Which tests and checks are required.
- Which changes are forbidden without explicit approval.
- Whether the task requires a low, medium, high, or critical risk workflow.

### 7.4 Impact Map

Impact Guard produces an Impact Map before execution.

```yaml
change_target:
  module: packages/auth-client
  files:
    - packages/auth-client/src/interceptor.ts

upstream_dependencies:
  - services/auth
  - packages/config
  - packages/logger

downstream_dependents:
  - apps/web
  - apps/admin
  - packages/session

contracts_touched:
  - contract_id: auth.error.AUTH_EXPIRED
    consumers:
      - apps/web
      - apps/admin
    compatibility: must_preserve

risk:
  level: high
  reasons:
    - "Authentication flow"
    - "Crosses web and admin applications"
    - "Error code is consumed by multiple callers"

required_verification:
  - pnpm --filter auth-client test
  - pnpm --filter web test auth
  - pnpm --filter admin test auth

forbidden_changes:
  - "Do not change backend authentication protocol"
  - "Do not modify database migrations"
  - "Do not change token storage mechanism"
```

### 7.5 User-Facing Summary

Before execution, users should see a concise explanation such as:

```text
This change affects 4 modules, 2 public contracts, and 11 call sites.
Risk level: High.
Required verification: 3 unit test groups and 1 e2e scenario.
Forbidden automatic changes: auth service API, database migrations, token storage.
```

### 7.6 Risk Levels

| Risk | Typical Signals | Required Control |
| --- | --- | --- |
| Low | Local UI copy, isolated test updates, non-contract code | Auto-plan and execute with standard verification |
| Medium | Shared utilities, local API behavior, multiple files | Impact Map, scoped Context Lease, affected tests |
| High | Auth, payment, data model, public API, cross-app behavior | Explicit plan, strict lease, expanded verification, reviewer focus |
| Critical | Migrations, security policy, production config, destructive operations | Human approval before modification, restricted execution, mandatory audit |

### 7.7 Acceptance Criteria

- AgentForge generates an Impact Map before editing files for non-trivial tasks.
- Impact Map includes target files, upstream dependencies, downstream dependents, contracts touched, risk, required verification, and forbidden changes.
- High-risk and critical changes cannot proceed without visible risk explanation.
- Actual changed files are compared with planned impact after execution.
- Impact Guard feeds required verification into Evidence Pipeline.

## 8. Governed Agent Runtime

### 8.1 Objective

Governed Agent Runtime enables multi-agent execution without turning AgentForge into an uncontrolled agent swarm. The product should emphasize controlled, permissioned, traceable, and reversible agent collaboration.

### 8.2 Agent Roles

AgentForge may internally use specialized agents:

| Agent | Responsibility |
| --- | --- |
| Orchestrator | Understands goals, decomposes work, controls permissions, decides merge readiness |
| Architect Agent | Designs approach, identifies architecture constraints, splits tasks |
| Impact Agent | Determines blast radius, risk level, and affected tests |
| Contract Agent | Checks module contracts, breaking changes, and compatibility |
| Search Agent | Performs read-only retrieval across code, docs, and historical decisions |
| Coder Agent | Modifies code only within authorized write scope |
| Tester Agent | Adds tests, runs tests, and investigates failures |
| Reviewer Agent | Reviews diff, risk, conventions, and maintainability |
| Doc Agent | Produces docs, release notes, and Project Brain update candidates |

These roles should appear as an agent timeline and execution explanation, not as separate product modes.

### 8.3 Context Lease

Every subagent must receive a Context Lease before execution.

```yaml
agent: coder-agent
task_id: AUTH-042
lease_id: ctx_8f3a

can_read:
  - packages/auth-client/**
  - apps/web/src/api/client.ts
  - apps/admin/src/api/client.ts

can_write:
  - packages/auth-client/src/interceptor.ts
  - packages/auth-client/src/interceptor.test.ts

can_use_facts:
  - auth.refresh-token.interceptor
  - auth.error.AUTH_EXPIRED
  - web.redirect-after-login.contract

tools:
  - read_file
  - edit_file
  - run_test

requires_approval_for:
  - package.json
  - database/**
  - services/auth/**
```

### 8.4 Context Expansion

Subagents must request expanded context instead of freely reading or writing the whole repository.

```json
{
  "event": "request_context",
  "agent": "coder-agent",
  "reason": "Need to confirm whether admin depends on AUTH_EXPIRED error code",
  "requested_files": [
    "apps/admin/src/api/client.ts"
  ]
}
```

### 8.5 Structured Blackboard

Agent collaboration should be represented as structured events, not informal chat.

```json
{ "event": "impact_map_generated", "risk": "high" }
{ "event": "lease_granted", "agent": "coder-agent" }
{ "event": "file_claimed", "file": "interceptor.ts" }
{ "event": "contract_risk_found", "contract": "AUTH_EXPIRED" }
{ "event": "test_failed", "command": "pnpm test auth" }
{ "event": "ready_for_review" }
```

### 8.6 Acceptance Criteria

- Each agent action is associated with a lease, task, tool, and timestamp.
- Coder agents cannot write outside granted write scope.
- Agents can request additional context with a reason.
- Timeline events are visible to the user and recorded in the audit log.
- File claims prevent multi-agent overwrite conflicts.
- Runtime can explain why each agent was invoked.

## 9. Evidence Pipeline

### 9.1 Objective

Evidence Pipeline turns AI-generated code into reviewable engineering work. Every task should end with proof of what changed, why it changed, what was verified, what remains unverified, and where reviewers should focus.

### 9.2 Evidence Review Packet

The final delivery artifact is an Evidence Review Packet containing:

- Task goal.
- Final result.
- Changed files.
- File-level intent.
- Impact Map.
- Contracts touched.
- Planned impact vs actual impact.
- Tests and checks run.
- Tests and checks not run but recommended.
- Risk level.
- Out-of-scope or lease-expansion events.
- Breaking-change assessment.
- Suggested commit or PR structure.
- Reviewer focus areas.
- Project Brain update suggestions.

### 9.3 Example Packet

```markdown
# Review Packet: AUTH-042

## Result
Fixed silent page failure after refresh token expiration.

## Changed Files
- packages/auth-client/src/interceptor.ts
  - Added explicit AUTH_EXPIRED return when refresh fails.
- packages/auth-client/src/interceptor.test.ts
  - Added refresh-token-expired scenario coverage.

## Impact
Affected modules:
- apps/web
- apps/admin
- packages/session

High-risk contracts:
- auth.error.AUTH_EXPIRED
- auth.redirect.original-url

## Verification
Ran:
- pnpm --filter auth-client test ✅
- pnpm --filter web test auth ✅

Not run:
- pnpm --filter admin test auth
  - Reason: local admin test dependency missing.

## Reviewer Focus
1. Confirm AUTH_EXPIRED error-code compatibility.
2. Confirm redirect URL is preserved after refresh failure.
3. Confirm there is no 401 retry loop.
```

### 9.4 Acceptance Criteria

- Every completed code-change task produces an Evidence Review Packet.
- Packet distinguishes passed verification from skipped or unavailable verification.
- Packet compares planned impact with actual changed files.
- Packet identifies reviewer focus areas based on contracts and risk.
- Packet can be exported into a PR description.

## 10. Commercial Delivery Layer

### 10.1 Objective

Commercial Delivery Layer makes AgentForge viable for teams and enterprises rather than only individual developers.

### 10.2 Capabilities

1. **Team Project Brain** — shared project intelligence across team members.
2. **Organization Policy** — organization rules, forbidden zones, and required review areas.
3. **Agent Permission System** — tool, file, command, and model permissions.
4. **Audit Log** — every file read, file modified, command run, model used, and agent decision.
5. **PR Integration** — GitHub, GitLab, and Bitbucket PR creation, comments, review packets, and status checks.
6. **CI Integration** — CI result ingestion and Evidence Pipeline updates.
7. **Risk Dashboard** — high-risk modules, frequent failure zones, agent error patterns, and risky diffs.
8. **Memory Governance** — fact approval, expiration, rollback, conflict resolution, and policy enforcement.
9. **Model Routing** — task-specific model selection, BYOK, and private enterprise models.
10. **Compliance Controls** — restrictions for `.env`, secrets, production configuration, and customer data.

### 10.3 Acceptance Criteria

- Team administrators can define policy for forbidden files, approval-required files, command allowlists, and model access.
- Audit logs are queryable by task, agent, file, command, and PR.
- Review Packets can be attached to PRs.
- CI results can update task evidence after local execution.
- Risk dashboards aggregate task outcomes over time.

## 11. User Interface Requirements

### 11.1 Layout

AgentForge should use a unified desktop layout:

```text
┌──────────────────────────────────────────────────────────────┐
│ AgentForge                                                   │
│ Project: sky-web-platform       Brain: Synced   Risk: Medium │
├───────────────┬────────────────────────────────┬─────────────┤
│ Project       │ Workspace                      │ Intelligence│
│               │                                │             │
│ Files         │ Goal / Spec / Plan             │ Project Brain│
│ Brain         │ Editor                         │ Impact Guard │
│ Contracts     │ Diff                           │ Agent Timeline│
│ Tasks         │ Review Packet                  │ Context Lease│
│ PRs           │ Preview                        │ Test Evidence│
├───────────────┴────────────────────────────────┴─────────────┤
│ Terminal | Tests | Logs | Git | Sandbox                       │
└──────────────────────────────────────────────────────────────┘
```

### 11.2 Navigation Principles

- Left side: project surfaces such as files, brain, contracts, tasks, and PRs.
- Center: current task, goal, spec, plan, editor, diff, review packet, and preview.
- Right side: intelligence surfaces such as Project Brain, Impact Guard, Agent Timeline, Context Lease, Test Evidence, Risk Alerts, and Memory Updates.
- Bottom: terminal, tests, logs, git, and sandbox execution.

### 11.3 Required Actions

At the end of a task, users can choose:

- **Apply** — apply generated changes locally.
- **Revise** — request changes to plan, code, tests, or review packet.
- **Create PR** — publish the changes with Evidence Review Packet.
- **Discard** — remove the generated changes.

## 12. Core Workflow Requirements

### 12.1 Open Project

1. User opens a repository.
2. AgentForge scans the repository.
3. AgentForge builds initial Project Brain.
4. AgentForge identifies modules, dependencies, tests, contracts, and risky areas.
5. AgentForge displays Repo Intelligence and Project Brain confidence.

### 12.2 Enter Goal

1. User enters a natural-language development goal.
2. AgentForge classifies the task internally.
3. AgentForge retrieves relevant Project Brain facts.
4. AgentForge runs Impact Guard.
5. AgentForge presents risk, options, and recommendation before editing.

Example:

```text
Goal: Rename nickname to displayName in user profile.

Impact Guard found:
- apps/web/profile
- apps/admin/users
- services/user API
- packages/shared/types
- analytics user_profile_updated event

Option A: Change only front-end display copy while keeping API field nickname.
Risk: Low. No database migration required.

Option B: Full field migration nickname → displayName.
Risk: High. Requires migration, API compatibility layer, admin sync, and analytics compatibility.

Recommendation: Execute Option A because the current requirement does not explicitly require a breaking field migration.
```

### 12.3 Generate Execution Plan

AgentForge generates:

- Spec.
- Plan.
- Impact Map.
- Task Capsule.
- Context Lease.
- Required Tests.
- Review Focus.

### 12.4 Execute Change

1. Orchestrator assigns scoped tasks.
2. Architect Agent validates design.
3. Impact Agent validates affected scope.
4. Contract Agent checks compatibility.
5. Coder Agent edits authorized files.
6. Tester Agent runs affected verification.
7. Reviewer Agent inspects diff and risk.
8. Doc Agent proposes Project Brain updates.

### 12.5 Prove and Deliver

AgentForge delivers:

- Code diff.
- Review Packet.
- Test evidence.
- Risk explanation.
- PR description.
- Project Brain update candidates.

## 13. Branded Feature Names

| Feature | Chinese Name | Purpose |
| --- | --- | --- |
| Project Brain | 项目大脑 | Shared project intelligence |
| Impact Guard | 影响防护 | Change impact and risk analysis |
| Task Capsule | 任务胶囊 | Structured task spec, plan, scope, and evidence |
| Context Lease | 上下文租约 | Scoped agent permissions and context |
| Agent Timeline | 智能体时间线 | Traceable agent execution events |
| Evidence Review | 证据审查 | Reviewable proof of changes and verification |
| Contract Graph | 契约图谱 | Public APIs, contracts, and compatibility relationships |
| Safe Apply | 安全应用 | Controlled application of generated changes |
| Brain Sync | 项目大脑同步 | Team synchronization of Project Brain facts |
| Risk Radar | 风险雷达 | Risk aggregation and dashboarding |

Commercial explanation:

- Project Brain lets AI remember the project.
- Impact Guard lets AI know what the change may affect.
- Context Lease prevents subagents from reading and editing without boundaries.
- Evidence Review helps teams trust and merge AI-written code.

## 14. Competitive Positioning

AgentForge may absorb useful patterns from existing tools, but it should not become a feature pile.

| Source of Inspiration | Adopted Strength |
| --- | --- |
| Qoder | End-to-end quest-like task execution, repo intelligence, autonomous development workspace, expert groups |
| Trae | Unified context across browser, terminal, docs, design, and product-building workflows |
| Hermes | Long-term memory, architecture decisions, cross-session continuity |
| Claude Code | Subagents, hooks, MCP, agent teams, tool permissions |
| Codex | Sandboxed execution, parallel tasks, test logs, PR loop, AGENTS.md-style project rules |

AgentForge's original moat should be:

- Project Brain.
- Impact Guard.
- Context Lease.
- Evidence Review.
- Contract Graph.
- Planned impact vs actual impact.


## 15. Coding Tool Parity Requirements

### 15.1 Objective

AgentForge must be excellent as a coding tool before its higher-level governance systems can matter. The workspace should match the practical usability users expect from Qoder, Trae, Claude Code, Codex-style agent workflows, and similar agentic coding products while preserving AgentForge's unified product mental model.

This means competitor-style capabilities should be implemented as integrated surfaces inside AgentForge Workspace, not as a set of separate top-level modes. Users should feel that AgentForge can do everything they expect from a modern coding agent, while AgentForge additionally provides Project Brain, Impact Guard, Context Lease, and Evidence Review.

### 15.2 Baseline Coding Capabilities

AgentForge must support the core day-to-day coding loop:

- Open, index, search, and navigate large repositories.
- Read and edit files with IDE-quality ergonomics.
- Generate, modify, refactor, and delete code across multiple files.
- Explain existing code and answer repository questions using Project Brain and live search.
- Apply patch sets safely with clear diffs, file-level intent, and rollback checkpoints.
- Run formatters, linters, type checks, unit tests, integration tests, and project-specific commands.
- Create, update, split, and summarize commits.
- Prepare PR descriptions from Evidence Review Packets.
- Preserve user edits and prevent agent changes from overwriting unreviewed local work.

### 15.3 Background Runtime and Task Execution

AgentForge must provide a reliable background execution layer comparable to leading autonomous coding workspaces:

- Long-running tasks continue in the background without blocking the editor.
- Users can pause, resume, cancel, or revise a task.
- Each task has visible status, logs, artifacts, changed files, and verification state.
- Multiple tasks can run concurrently when their Context Leases and file claims do not conflict.
- Tasks can be checkpointed before risky operations.
- Failed tasks preserve enough logs and state for diagnosis and retry.
- Sandboxed execution is available for risky commands, dependency installation, tests, and generated code.

### 15.4 Tool Calling and Integrations

AgentForge must include a first-class tool-calling system so agents can operate like capable engineering teammates:

- File tools: read, edit, create, delete, rename, search, and semantic search.
- Code intelligence tools: symbol lookup, references, definitions, call graph, type information, and dependency graph.
- Shell tools: terminal command execution, command policies, output capture, and retry handling.
- Git tools: diff, status, branch, commit, stash, restore, blame, history, and PR preparation.
- Test tools: test discovery, affected-test selection, command execution, result parsing, and failure triage.
- Browser and preview tools: local app preview, URL inspection, screenshot capture, console logs, and UI validation.
- Documentation tools: local docs search, repository docs, architecture notes, generated docs, and external docs connectors when allowed.
- MCP-style extension tools: third-party services, issue trackers, design tools, CI systems, databases, and custom organization tools.
- Policy controls: every tool call must be governed by Context Lease, organization policy, audit logging, and approval requirements.

### 15.5 Developer Experience Requirements

AgentForge should feel fast, transparent, and controllable:

- Users can see what the agent is doing now and why.
- Users can inspect planned tool calls before high-risk execution.
- Users can approve, deny, or narrow requested context expansion.
- Users can provide inline correction without restarting the whole task.
- Users can jump from an agent event to the exact file, diff, command log, test result, or Project Brain fact.
- Users can compare planned impact with actual changes at any time.
- Users can restore from checkpoints and discard partial work cleanly.

### 15.6 Parity Without Product Dilution

AgentForge should absorb the practical strengths of leading tools without copying their product architecture:

| Expected Capability | AgentForge Expression |
| --- | --- |
| Autonomous end-to-end implementation | Goal-driven task flow inside AgentForge Workspace |
| Repository wiki and project understanding | Shared Project Brain with evidence and invalidation |
| Unified browser, terminal, docs, and preview context | Workspace panels connected to the current task and Context Lease |
| Subagents and specialized workers | Governed Agent Runtime with scoped roles and structured timeline |
| Hooks, MCP, and tool permissions | Policy-governed tool-calling layer with audit logs |
| Sandboxed coding and test execution | Evidence Pipeline plus sandboxed terminal/test runs |
| PR-ready delivery | Evidence Review Packet and PR integration |

### 15.7 Acceptance Criteria

- A developer can use AgentForge as their primary coding agent for normal repository edits, refactors, tests, and PR preparation.
- Tool calls are visible, replayable, and tied to task evidence.
- Background tasks can be paused, resumed, canceled, revised, and inspected.
- AgentForge can run terminal commands and tests with captured logs and policy enforcement.
- AgentForge can preview web applications and capture relevant UI evidence when the task changes UI behavior.
- AgentForge supports extension through MCP-style tool integrations while preserving lease-based permissions.
- AgentForge's additional governance must not make simple coding tasks feel slower or heavier than competing tools.

## 16. Packaging and Pricing Direction

| Plan | Included Capabilities |
| --- | --- |
| Free | Basic editor, lightweight ask, local edits, small Project Brain |
| Pro | Full Project Brain, Impact Guard, autonomous task execution, local multi-agent runtime, Review Packet |
| Team | Team Project Brain, PR integration, organization policy, review workflow, task history |
| Enterprise | Private deployment, SSO, permissions, audit, model gateway, compliance, private code indexing, organization risk dashboard |

The strongest monetization opportunities are Team and Enterprise. Free and Pro should drive adoption, product learning, and individual advocacy.

## 17. MVP Scope

The MVP should prove the core product thesis without overbuilding enterprise administration.

### 17.1 MVP Must Have

- Unified AgentForge Workspace without explicit Ask / Quest / Review modes.
- Repository scan and basic Project Brain.
- Evidence-backed facts with file references and confidence.
- Impact Guard for code-change tasks.
- Impact Map display before editing.
- Context Lease for agent file read/write scopes.
- Agent Timeline event log.
- Sandboxed code modification workflow.
- Integrated terminal command execution with captured logs.
- Basic file editing, diff review, patch apply, and rollback checkpoints.
- Affected test command recommendation.
- Evidence Review Packet generation.
- Apply / Revise / Discard actions.

### 17.2 MVP Should Have

- Git diff integration.
- Basic PR description export.
- Basic Contract Graph for public exports, APIs, and schemas.
- Memory update candidates after task completion.
- Planned impact vs actual impact comparison.

### 17.3 MVP Not Yet

- Full enterprise SSO.
- Organization-wide analytics.
- Full model gateway.
- Complex billing admin.
- Full GitHub/GitLab/Bitbucket review automation.
- Deep compliance reporting.

## 18. Success Metrics

### 18.1 Product Metrics

- Percentage of code-change tasks with generated Impact Map.
- Percentage of completed tasks with Evidence Review Packet.
- Planned impact vs actual impact accuracy.
- Required verification coverage rate.
- Agent lease violation rate.
- Project Brain fact staleness rate.
- User acceptance rate for generated changes.
- PR merge rate for AgentForge-generated changes.

### 18.2 Business Metrics

- Free-to-Pro conversion.
- Pro-to-Team expansion.
- Team weekly active repositories.
- Review Packet usage in PRs.
- Enterprise pilot conversion.
- Average number of team-approved Project Brain facts.

### 18.3 Trust Metrics

- Reviewer time saved.
- Number of high-risk changes caught before execution.
- Number of forbidden modifications prevented.
- Number of unverified risks surfaced before PR.
- User-reported confidence in generated changes.

## 19. Non-Goals

- AgentForge should not be positioned as a generic AI IDE.
- AgentForge should not expose a mode-heavy product architecture.
- AgentForge should not optimize only for fastest code generation.
- AgentForge should not allow unrestricted subagent repository access by default.
- AgentForge should not treat unsourced agent memory as trusted project fact.
- AgentForge should not hide unrun tests or uncertain verification.

## 20. Final Product Definition

AgentForge is an agentic engineering workspace for real-world codebases. It combines autonomous coding, shared project intelligence, impact analysis, governed subagents, sandboxed execution, and evidence-based review into one desktop product. Before changing code, AgentForge builds a live understanding of the project, maps the blast radius of the requested change, identifies module contracts and affected tests, and assigns scoped work to specialized agents. After the change, it produces a review packet with diffs, verification logs, risks, and suggested PR structure.

AgentForge 是一款面向真实工程项目的智能体开发工作台。它把自主编码、共享项目大脑、变更影响分析、受控多智能体、隔离执行和证据化审查整合到一个桌面产品中。每次修改代码前，AgentForge 会先理解项目结构、分析变更影响半径、识别模块契约和受影响测试，再把受限任务分配给专业子智能体。每次修改完成后，AgentForge 会生成包含 diff、测试日志、风险说明和 PR 建议的审查证据包，让团队能够安全合并 AI 代码。
