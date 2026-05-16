# AgentForge

AgentForge is an Agentic Coding Desktop for real-world engineering projects.
It is designed as a unified workspace where AI understands the project, analyzes impact, controls change, verifies results, and delivers reviewable code.

As a coding tool, AgentForge must also provide a first-class day-to-day coding experience: repository navigation, file editing, tool calls, terminal execution, testing, previews, background tasks, and PR preparation should feel as capable as leading agentic coding products.

See the product PRD: [docs/agentforge-product-prd.md](docs/agentforge-product-prd.md).

## MVP Scaffold

This repository now contains the first PRD-aligned AgentForge MVP scaffold:

- `apps/desktop` renders the unified AgentForge Workspace shell.
- `packages/core` defines Project Brain, fact-store governance, Contract Graph, Impact Guard, Organization Policy, PR/CI delivery, Task Capsule, Context Lease, and Evidence Review domain models.
- `packages/runtime` provides the initial Governed Agent Runtime primitives: Context Lease enforcement, Agent Timeline, File Claims, Audit Log, Task Session, Safe Apply change management, rollback checkpoints, and Orchestrator.
- `packages/tools` provides organization-policy-governed file, shell, git, and test tool adapters with auditable tool-call execution.
- `packages/ui` renders the Workspace, Project, Intelligence, Contract Graph, Memory Governance, PR Integration, and Evidence Review surfaces without introducing separate product modes.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm --filter @agentforge/desktop start
```

Running the desktop start script generates `apps/desktop/dist/workspace.html`, a static preview of the current unified workspace shell.
