# AgentForge Native PRD

**版本**：Commercial Product Definition v1.0  
**文档状态**：Final Commercial PRD  
**产品代号**：AgentForge Native  
**产品类型**：原生 Agentic Engineering Workspace  
**核心主张**：交付真正能合并的 AI 代码。  
**一句话定位**：AgentForge 是一款面向真实工程项目的智能体开发工作台，内置共享项目大脑、变更影响防护、受控多智能体执行和证据化审查，让 AI 在修改代码前理解项目和影响，在修改代码后证明代码可以安全合并。

---

## 0. 文档目标

本文档定义 AgentForge Native 的最终商用交付产品形态。它不是 MVP 文档，也不是功能探索稿，而是用于产品、设计、工程、商业化和融资沟通的正式 PRD。

本 PRD 明确：

1. 产品最终定位与商业价值。
2. 原生工作台路线，即 B 路线：自研 Agentic Engineering Workspace，Monaco 仅作为代码编辑组件。
3. 核心差异化能力：Project Brain、Impact Guard、Context Lease、Governed Agent Runtime、Evidence Review。
4. 最终用户工作流、界面结构、关键功能、数据对象、安全治理和商业化包装。
5. 如何把 Qoder、Trae、Hermes、Claude Code、Codex 等当前先进产品的优势融合到一个统一、可商用、强品牌心智的产品中。

---

## 1. 执行摘要

AgentForge Native 是为 AI 编程时代重新设计的开发工作台。

传统 IDE 以文件为中心，AI coding 工具通常以聊天和代码生成作为入口。AgentForge 以工程目标为中心：用户输入想让项目发生什么变化，系统先构建或读取 Project Brain，分析变更影响半径，识别模块契约、调用方约束和受影响测试，再调度受控子智能体在明确上下文租约内执行修改。

任务完成后，系统生成 Evidence Review Packet，包含 diff、意图解释、测试日志、风险说明、未验证项、PR 建议和 Project Brain 更新候选。

AgentForge 的核心商业价值是让团队可以更安全、更可控、更可审查地使用 AI 修改真实代码库。

AgentForge 不只回答“怎么改代码”，还回答：

- 这个需求会影响哪些模块？
- 其他模块对目标模块有什么限制？
- 哪些契约不能破坏？
- 哪些文件允许修改，哪些禁止修改？
- 哪些测试必须跑？
- 子 agent 为什么读这些文件、改这些文件？
- 这次修改是否超出原始任务边界？
- 人类 reviewer 应该重点看哪里？
- 哪些项目事实需要更新，哪些记忆已经过期？

最终心智：

> 普通 AI coding 工具会改代码。  
> AgentForge 会先理解影响，再受控修改，最后给出可合并证据。

---

## 2. 产品定位

### 2.1 产品类别

AgentForge 属于全新的产品类别：

**Agentic Engineering Workspace / 智能体工程工作台**

它不是传统 AI IDE，也不是 VS Code 插件，也不是命令行 agent。它是一款原生桌面工作台，服务于真实工程变更的完整生命周期：

```text
Goal → Understanding → Impact → Plan → Controlled Change → Evidence → Merge
```

中文：

```text
目标 → 理解 → 影响分析 → 计划 → 受控修改 → 证据 → 合并
```

### 2.2 核心定位文案

**英文版**

> AgentForge is an agentic engineering workspace for real-world codebases. It builds a live understanding of your project, maps the blast radius of every change, coordinates governed agents, and produces review-ready evidence for every AI-generated diff.

**中文版**

> AgentForge 是一款面向真实工程项目的智能体开发工作台。它会理解你的代码库，分析每次改动的影响半径，调度受控智能体执行，并为每个 AI 生成的 diff 提供可审查证据。

### 2.3 产品边界

AgentForge 做：

- 原生 Agentic Engineering Workspace。
- 工程目标驱动的开发任务流。
- Project Brain 项目大脑。
- Impact Guard 变更影响防护。
- Context Lease 子 agent 上下文与权限治理。
- Evidence Review 证据化审查。
- 工作区、编辑器、终端、Git、测试、沙箱、PR 的一体化交付流。
- 面向团队和企业的审计、策略、权限、记忆治理。

AgentForge 不做：

- 普通 VS Code fork。
- 普通 AI Chat 插件。
- 纯代码补全工具。
- 只适用于 demo 项目的玩具 agent。
- 无约束的多 agent 群聊。
- 无证据来源的长期记忆。
- 只强调生成速度、不强调影响和审查的 AI IDE。

---

## 3. 背景与问题

### 问题 1：agent 只改需求对应文件，不理解影响半径

用户提出修改 A 模块，agent 往往只搜索 A 相关文件并直接修改。它不一定理解 A 被哪些模块调用、依赖哪些模块、对外暴露哪些 API、类型、事件、状态和副作用，也不一定知道其他模块对 A 的隐式约束。这会导致局部修改成功，但其他模块出现回归。

### 问题 2：子 agent 记忆割裂，全局理解不一致

多 agent 系统中，每个子 agent 通常拥有自己的上下文和任务片段。它们可能重复阅读项目、形成不同假设，并在没有共享项目事实源的情况下各自执行。

### 问题 3：长期记忆容易污染

很多 memory 系统把 agent 总结、聊天历史、用户偏好和项目事实混在一起。AgentForge 必须确保高置信项目事实来自代码、测试、PR、CI 或人工确认，并具备证据来源、置信度和过期机制。

### 问题 4：人类 reviewer 不敢合并 AI 代码

AI 可以生成 diff，但团队往往不敢直接合并，因为 reviewer 不清楚为什么改这些文件、是否超出任务范围、是否破坏隐式契约、跑了哪些测试、哪些测试没跑、哪些风险还存在、哪里需要重点审查。

### 问题 5：传统 IDE 心智无法承载 AI 工程流

传统 IDE 以文件、编辑器、终端、Git 为中心。AI 时代的工程工作流更像：输入目标、理解项目、识别影响、分配智能体、受控执行、收集证据、安全合并。

---

## 4. 产品原则

1. **目标优先于文件**：用户首先表达希望项目发生的变化，而不是先打开某个文件。
2. **影响分析优先于代码修改**：中高风险变更必须先通过 Impact Guard。
3. **项目事实属于系统，不属于 agent**：所有 agent 共享同一个 Project Brain。
4. **子 agent 必须受控**：每个子 agent 必须领取 Context Lease。
5. **证据优先于描述**：任务完成不能只输出“已完成”，必须输出 Evidence Review Packet。
6. **记忆必须有证据和过期机制**：agent 的总结不能直接进入长期项目记忆。
7. **创新能力必须显式可见**：Project Brain、Impact Guard、Context Lease、Agent Timeline、Evidence Stack、Review Packet 必须在工作台中作为第一视觉层级存在。

---

## 5. 目标用户与场景

### 个人高级开发者

需要快速从需求到代码交付，同时关注项目长期可维护性。

### 小型研发团队

需要 AI agent 参与真实开发，但担心误改、上下文丢失和 review 成本高。

### 中大型工程组织

需要组织级策略、权限控制、AI 操作审计、高风险改动管控和团队级项目知识沉淀。

### AI-native 开发团队

已经同时使用 Claude Code、Codex、Qoder、Trae、Cursor、Windsurf 等工具，需要更统一的项目记忆和交付证据。

---

## 6. 商业目标

AgentForge 最终商用版需要达成以下目标：

1. 成为一款完整可用的原生 AI 工程工作台。
2. 在真实代码库中显著降低 AI coding 的误改风险。
3. 让用户能够看到每次改动的影响半径、风险和验证证据。
4. 解决子 agent 重复读项目、记忆割裂和越权修改问题。
5. 让团队愿意把 AgentForge 产物用于真实 PR 和真实合并流程。
6. 建立 Project Brain 作为长期可积累、可治理的项目智能资产。

关键指标包括：Apply / Merge 比例、Impact Guard 准确率、Affected tests 推荐命中率、agent 越界修改拦截次数、Review Packet 采纳率、Project Brain 错误事实率、复杂任务完成时间下降比例、reviewer 理解 diff 时间下降比例。

---

## 7. 产品总体结构

AgentForge Native 最终由五个核心系统组成：

```text
1. Shared Project Brain
   共享项目大脑

2. Impact Guard
   变更影响防护

3. Governed Agent Runtime
   受控多智能体运行时

4. Evidence Pipeline
   证据化执行与审查流水线

5. Commercial Delivery Layer
   团队级交付、权限、审计和商业化能力
```

整体结构：

```text
AgentForge Native Desktop
├─ Native Workbench
│  ├─ Goal Bar
│  ├─ Project Brain Navigator
│  ├─ Task Workspace
│  ├─ Intelligence HUD
│  ├─ Evidence Console
│  └─ Review Surface
├─ Editor Layer
│  ├─ Monaco Editor
│  ├─ LSP Bridge
│  ├─ Intent Diff Viewer
│  ├─ Inline Suggestions
│  └─ Symbol Navigation
├─ AgentForge Kernel
│  ├─ Project Brain Service
│  ├─ Impact Guard Engine
│  ├─ Contract Graph Engine
│  ├─ Task Capsule Compiler
│  ├─ Context Lease Manager
│  ├─ Agent Runtime
│  ├─ Worktree Manager
│  ├─ Sandbox Runner
│  ├─ Evidence Pipeline
│  ├─ Memory Governance
│  └─ Model Gateway
├─ Developer Runtime
│  ├─ Terminal
│  ├─ Git
│  ├─ Test Runner
│  ├─ Debug Adapter Bridge
│  ├─ Package Manager Adapter
│  └─ DevContainer / Docker Adapter
└─ Cloud Layer
   ├─ Remote Sandbox
   ├─ Team Brain Sync
   ├─ PR Integration
   ├─ Policy Management
   ├─ Audit Logs
   ├─ Organization Admin
   └─ Billing
```

---

## 8. 工作台设计

AgentForge 采用原生 B 路线：自研工作台，Monaco 仅作为代码编辑组件。它不做 VS Code fork，不做普通编辑器套 AI 面板。

```text
┌────────────────────────────────────────────────────────────────────┐
│ AgentForge                                                         │
│ Goal Bar: 你想让这个项目发生什么变化？                               │
├──────────────────┬──────────────────────────────┬──────────────────┤
│ PROJECT BRAIN     │ TASK WORKSPACE               │ INTELLIGENCE HUD  │
│ Project Map       │ Spec / Plan                  │ Impact Guard      │
│ Modules           │ Code Editor                  │ Risk Radar        │
│ Contracts         │ Intent Diff                  │ Agent Timeline    │
│ APIs              │ Review Packet                │ Context Leases    │
│ Tests             │ Preview                      │ Evidence Stack    │
│ Decisions         │                              │ Brain Updates     │
│ Memory            │                              │                  │
│ Files             │                              │                  │
├──────────────────┴──────────────────────────────┴──────────────────┤
│ Evidence Console: Terminal | Tests | Logs | Git | Sandbox | CI       │
└────────────────────────────────────────────────────────────────────┘
```

用户心智：左边是项目，中间是任务，右边是 AI 如何判断、授权、执行和控制风险，底部是所有执行证据和日志。

---

## 9. 核心功能需求

### F1. Project Brain：共享项目大脑

目标：构建项目级共享事实层，让所有 agent 使用同一个项目世界模型，避免重复理解和互相冲突。

Project Brain 必须支持：扫描代码库、识别模块与包、构建 import/export 图和模块依赖图、识别 public API、exported types、schema、配置入口、测试文件、测试命令、高风险目录、架构决策、团队规则和项目约束。每条事实必须记录证据、置信度、来源和过期条件。

项目事实示例：

```yaml
fact_id: auth.refresh-token.interceptor
type: behavior_contract
statement: "前端 401 和 refresh token 处理集中在 auth-client interceptor"
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

### F2. Impact Guard：变更影响防护

目标：在 agent 修改代码前分析本次变更影响半径、模块约束、触及契约、风险等级和必跑测试。

Impact Guard 必须回答：目标模块被谁调用、依赖谁、提供哪些契约、其他模块有什么限制、会影响哪些测试、是否存在 breaking change、是否需要人工审查。

Impact Map 示例：

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
    - "认证链路"
    - "跨 web/admin 两个应用"
    - "错误码被多个调用方依赖"
required_verification:
  - pnpm --filter auth-client test
  - pnpm --filter web test auth
  - pnpm --filter admin test auth
forbidden_changes:
  - "不得修改后端认证协议"
  - "不得修改数据库 migration"
  - "不得改变 token storage 机制"
```

### F3. Task Capsule：任务胶囊

目标：把自然语言需求编译为 agent 可执行合同。

```yaml
task_id: AUTH-042
goal: "修复 refresh token 过期后页面静默失败的问题"
non_goals:
  - "不更换认证库"
  - "不重构登录页面"
writable:
  - packages/auth-client/src/interceptor.ts
  - packages/auth-client/src/interceptor.test.ts
readonly:
  - apps/web/src/api/client.ts
  - apps/admin/src/api/client.ts
forbidden:
  - database/migrations/**
  - services/auth/**
must_preserve:
  - contract: auth.error.AUTH_EXPIRED
    reason: "web/admin 依赖该错误码判断登录过期"
required_tests:
  - pnpm --filter auth-client test
  - pnpm --filter web test auth
```

### F4. Context Lease：上下文租约

目标：限制子 agent 的上下文、文件权限、工具权限和任务范围，解决子 agent 乱读、乱改、重复读项目的问题。

```yaml
agent: coder-agent
task_id: AUTH-042
lease_id: ctx_8f3a
can_read:
  - packages/auth-client/**
  - apps/web/src/api/client.ts
can_write:
  - packages/auth-client/src/interceptor.ts
  - packages/auth-client/src/interceptor.test.ts
can_use_facts:
  - auth.refresh-token.interceptor
  - auth.error.AUTH_EXPIRED
tools:
  - read_file
  - edit_file
  - run_test
requires_approval_for:
  - package.json
  - database/**
  - services/auth/**
```

### F5. Governed Agent Runtime：受控多智能体运行时

AgentForge 的 agent 团队包括：Orchestrator、Architect Agent、Impact Agent、Contract Agent、Search Agent、Coder Agent、Tester Agent、Reviewer Agent、Doc Agent。所有协作通过结构化 Blackboard 事件完成，不做无约束群聊。

```json
{ "event": "impact_map_generated", "risk": "high" }
{ "event": "lease_granted", "agent": "coder-agent" }
{ "event": "file_claimed", "file": "interceptor.ts" }
{ "event": "contract_risk_found", "contract": "AUTH_EXPIRED" }
{ "event": "test_failed", "command": "pnpm test auth" }
{ "event": "ready_for_review" }
```

### F6. Intent Diff：意图化 Diff

普通 diff 只展示文件改动。Intent Diff 要按业务意图组织修改：业务修复、兼容性保护、测试覆盖、文档更新、附带重构。

### F7. Evidence Pipeline：证据化执行流水线

所有命令、测试、CI、Git 操作、沙箱事件和 agent 日志都进入 Evidence Stack，并可被 Review Packet 引用。

### F8. Review Packet：审查证据包

Review Packet 是 AgentForge 的最终交付物，包含任务目标、实际结果、改动文件、每个文件对应的任务意图、Impact Map、触碰的模块契约、测试结果、未验证项、风险等级、是否越界、是否存在 breaking change、reviewer focus、PR 建议和 Project Brain 更新建议。

### F9. Safe Apply：安全应用

在用户应用 diff 前，系统必须展示 Safe Apply Checklist：Impact Map 是否生成、契约是否检查、worktree 是否隔离、测试是否通过、未验证项是否存在、是否触碰高风险路径。

---

## 10. 关键工作流

### 打开项目

```text
用户选择 repo
→ Kernel 扫描文件树
→ 识别 package manager
→ 识别语言 / 框架
→ 识别测试命令
→ 构建 import graph
→ 构建 module graph
→ 抽取 public exports
→ 抽取 schema / API / config
→ 生成 Repo Intelligence
→ 生成 Project Brain facts
```

### 创建任务

```text
用户在 Goal Bar 输入目标
→ Architect Agent 生成 Spec
→ Impact Agent 生成 Impact Map
→ Contract Agent 检查约束
→ 系统生成 Task Capsule
→ 用户确认 Plan
→ Agent Runtime 开始执行
```

### 执行任务

```text
Search Agent 读取相关上下文
Coder Agent 在 Context Lease 范围内改代码
Tester Agent 新增或运行测试
Reviewer Agent 审查 diff
Impact Guard 重新计算 actual impact
系统比较 planned impact vs actual impact
```

### 完成交付

```text
生成 Review Packet
生成 memory update proposal
生成 commit message / PR description
用户选择 Safe Apply、Revise、Create PR 或 Discard
```

---

## 11. 关键数据对象

### ProjectFact

```ts
type ProjectFact = {
  id: string
  type: "module" | "contract" | "command" | "risk" | "decision" | "test" | "api" | "schema"
  statement: string
  scope: Scope
  evidence: Evidence[]
  confidence: "low" | "medium" | "high"
  status: "candidate" | "active" | "stale" | "rejected" | "replaced"
  expiresWhen: ExpiryCondition[]
  createdAt: string
  updatedAt: string
}
```

### ImpactMap

```ts
type ImpactMap = {
  taskId: string
  target: ChangeTarget
  upstreamDependencies: ModuleRef[]
  downstreamDependents: ModuleRef[]
  contractsTouched: ContractRef[]
  affectedTests: TestCommand[]
  forbiddenChanges: string[]
  risk: RiskAssessment
  reviewFocus: string[]
  plannedImpactHash: string
  actualImpactHash?: string
}
```

### TaskCapsule

```ts
type TaskCapsule = {
  id: string
  goal: string
  nonGoals: string[]
  writable: string[]
  readonly: string[]
  forbidden: string[]
  mustPreserve: ContractRef[]
  affectedModules: ModuleRef[]
  requiredTests: TestCommand[]
  reviewPolicy: ReviewPolicy
}
```

### ContextLease

```ts
type ContextLease = {
  id: string
  taskId: string
  agentId: string
  canRead: string[]
  canWrite: string[]
  canUseFacts: string[]
  tools: string[]
  expiresAt: string
  requiresApprovalFor: string[]
  status: "active" | "expired" | "revoked"
}
```

### ReviewPacket

```ts
type ReviewPacket = {
  taskId: string
  result: string
  changedFiles: ChangedFile[]
  intentDiff: IntentDiff[]
  impactMap: ImpactMap
  verification: VerificationResult[]
  risks: RiskAssessment[]
  reviewerFocus: string[]
  unverifiedItems: UnverifiedItem[]
  memoryUpdates: MemoryUpdateProposal[]
  suggestedPr: SuggestedPr
}
```

---

## 12. 安全与权限

默认禁止 agent 读取或修改：`.env*`、`*.pem`、`*.key`、`secrets/**`、`credentials/**`、`production/**`。

高风险路径默认需要人工确认：`database/migrations/**`、`services/auth/**`、`payment/**`、`infra/**`、`ci/**`、`package.json`、lockfiles。

命令分级：Safe、Medium、High。High 命令必须确认或被组织策略允许。

团队可配置模型权限：哪些模型可用、哪些任务可用云模型、哪些目录只能用本地模型、是否允许将代码片段发送给第三方模型、最大上下文大小、单任务成本上限。

所有 agent 行为必须审计：读取文件、修改文件、运行命令、使用模型、Context Lease 变更、Apply / Create PR 操作、Project Brain 更新。

---

## 13. 商业版本

### Free

基础 Project Brain、小型 Impact Guard、单 agent 代码修改、本地 Review Packet 简版。

### Pro

完整 Project Brain、完整 Impact Guard、Worktree sandbox、多 agent 执行、Context Lease、Evidence Review、BYOK、高级模型路由。

### Team

Team Project Brain、共享记忆、PR 集成、团队策略、任务历史、Agent 审计、Review Packet 状态检查、团队风险面板。

### Enterprise

私有部署、SSO、RBAC、私有模型、私有代码索引、组织级策略、合规审计、自托管 sandboxes、自定义集成、SLA。

---

## 14. 竞品吸收与原创差异

AgentForge 吸收当前优秀产品的优势，但通过统一工作台和项目级内核重新组织。

```text
Qoder 类能力：端到端任务、Quest 工作流、Repo Wiki、自主开发、专家团。
Trae 类能力：统一上下文、浏览器/终端/文档/设计稿联动、产品构建体验。
Hermes 类能力：长期记忆、架构决策保存、跨会话上下文延续。
Claude Code 类能力：subagents、hooks、MCP、agent teams、工具权限。
Codex 类能力：沙箱执行、测试日志、GitHub PR、AGENTS.md 风格项目规则。
```

AgentForge 原创核心：Project Brain、Impact Guard、Context Lease、Evidence Review、Contract Graph、Intent Diff、Safe Apply、planned impact vs actual impact。

---

## 15. 成功体验标准

AgentForge 必须让用户在 10 分钟内感受到以下差异：

1. 打开项目后，系统能展示模块、契约、测试和风险。
2. 输入需求后，系统不是立刻改代码，而是先展示影响半径。
3. 用户能看到其他模块对目标模块的约束。
4. 用户能看到每个子 agent 的权限和任务。
5. 用户能看到 agent 为什么修改某个文件。
6. 用户能看到哪些测试跑了、哪些没跑。
7. 用户能拿到一份可直接用于 PR 审查的 Review Packet。
8. 用户能看到 Project Brain 如何基于证据更新。

---

## 16. 非功能需求

### 性能

打开中型 TypeScript monorepo 后，基础索引应在可接受时间内完成并渐进更新；Project Brain 支持增量更新；Impact Guard 支持快速初筛和深度分析两种策略。

### 稳定性

agent 执行失败不能导致主工作区污染；Worktree / sandbox 出错必须可回滚；Project Brain 更新必须可撤销；所有任务状态可恢复。

### 可解释性

每条风险必须有原因；每条项目事实必须有证据；每个 agent 行为必须可追踪；每个 diff 块必须可解释意图；每个未验证项必须显式展示。

### 可扩展性

支持多语言 analyzer 插件、自定义 contract extractor、自定义 test selector、自定义 review policy、企业自定义 agent、第三方 memory provider 和模型 provider。

---

## 17. 技术建议

桌面与前端：Electron 优先，React + TypeScript，Radix UI / Ariakit，Tailwind 或自研 design tokens，Zustand / Jotai，TanStack Query。

编辑器：Monaco Editor、LSP Bridge、Custom Intent Diff Viewer、Inline Agent Suggestions、Symbol Navigation、Diagnostics、Formatting。

Kernel：Rust，负责文件索引、Git / worktree、sandbox、权限拦截、命令执行、日志采集、本地事件总线、Project Brain 存储接口。

Agent Orchestration：TypeScript + Rust hybrid。TypeScript 负责模型 API、agent 流程、prompt / tool adapters、MCP adapters；Rust 负责权限边界、文件系统、sandbox、execution logs。

存储：SQLite、FTS5、LanceDB / sqlite-vss、SQLite edge tables for graph。

代码分析：tree-sitter、ripgrep、TypeScript Compiler API、tsserver、LSP adapters、framework-specific analyzers。

沙箱：Git worktree、Docker、DevContainer、Cloud sandbox。

---

## 18. 视觉与品牌语言

AgentForge 应该像工程级控制台，而不是聊天工具。

关键视觉元素：Brain Confidence badge、Impact Level badge、Risk Radar、Agent Timeline、Context Lease chips、Evidence checkmarks、Contract lock icon、Safe Apply gate、Stale Fact warning、Intent Diff labels。

颜色语义：绿色代表已验证，黄色代表部分验证或需要注意，红色代表高风险或阻断，蓝色代表 AI 正在分析或执行，紫色代表 Project Brain / Memory，灰色代表未验证或低置信。

---

## 19. 验收标准

### 产品体验验收

用户可以通过 Goal Bar 创建工程变更任务；系统能展示 Project Brain 概览、Impact Map、Task Capsule、Agent Timeline、Intent Diff、Evidence Stack、Review Packet；用户能 Safe Apply 或 Create PR。

### 工程质量验收

中高风险任务必须生成 Impact Guard；所有 agent 文件读写必须经过 Context Lease；Worktree / sandbox 隔离必须默认启用；所有测试命令和日志必须可追踪；所有 Project Brain 高置信事实必须有 evidence；所有 Review Packet 必须包含未验证项。

### 商业可用验收

团队能共享 Project Brain；团队能配置策略和风险路径；团队能审计 agent 行为；团队能将 Review Packet 集成到 PR；企业能配置模型策略、权限和合规要求。

---

## 20. 关键风险与应对

### 风险 1：自研工作台工程量大

应对：不做通用 VS Code 替代品，只做 agentic coding 必需的编辑器能力，资源优先投入 Project Brain、Impact Guard 和 Evidence Review。

### 风险 2：Impact Guard 不可能完全准确

应对：明确显示置信度，支持未验证项，使用静态分析、类型、schema、测试、历史数据和 LLM 的混合策略。

### 风险 3：Project Brain 事实污染

应对：事实分级，agent 推断只进候选区，代码、测试、PR、人工确认才可晋升，文件变更触发 stale，支持人工审查和回滚。

### 风险 4：多 agent 协作复杂

应对：不做自由群聊，使用 Orchestrator + Blackboard 事件，Context Lease 管控权限，初期限制并发写入。

### 风险 5：用户觉得流程太重

应对：小任务自动走轻量路径，中高风险任务强制 Impact Guard，UI 使用渐进披露。

---

## 21. 最终产品定义

AgentForge 是一款为 AI 编程时代重新设计的原生智能体工程工作台。它以工程目标为中心，而不是以文件编辑为中心。每次修改代码前，AgentForge 会基于 Project Brain 理解项目结构、模块契约、测试映射和历史决策，并通过 Impact Guard 分析变更影响半径和风险。随后，系统将任务编译为 Task Capsule，并通过 Context Lease 把受限上下文和权限分配给专业子智能体。任务完成后，AgentForge 生成 Evidence Review Packet，展示 diff、意图、测试日志、风险、未验证项和 PR 建议，让团队可以安全审查和合并 AI 代码。

最终用户心智：

```text
Project Brain 让 AI 记住项目。
Impact Guard 让 AI 知道改动会影响哪里。
Context Lease 让子 agent 不乱读乱改。
Evidence Review 让团队敢合并 AI 代码。
```

最终产品口号：

```text
AI code that ships.
```

中文：

```text
交付真正能合并的 AI 代码。
```

---

## 22. 附录：核心工作台展示顺序

一个任务从开始到结束，用户必须看到以下能力逐步出现：

```text
1. Project Brain 已理解项目
   显示模块、契约、测试、风险。

2. Impact Guard 分析影响半径
   显示 affected modules、contracts、required tests。

3. Task Capsule 生成执行边界
   显示目标、非目标、可读、可写、禁止区域。

4. Context Lease 分配给子 agent
   显示每个 agent 权限和工具范围。

5. Agent Timeline 实时记录执行
   显示谁在做什么、为什么做。

6. Intent Diff 解释每处改动意图
   显示业务修复、兼容性、测试、文档。

7. Evidence Stack 汇总验证证据
   显示命令、测试、日志、未验证项。

8. Review Packet 生成可合并交付
   显示风险、审查重点、PR 建议。

9. Brain Updates 更新项目大脑
   显示新事实、证据和置信度。
```

所有创新能力必须可见、可点击、可追溯、可干预。

---

## 23. Glossary

- **Project Brain**：共享项目大脑。AgentForge 对项目结构、模块、契约、测试、风险、决策和记忆的结构化理解。
- **Impact Guard**：变更影响防护。每次修改前分析影响半径、上下游依赖、模块契约、受影响测试和风险。
- **Contract Graph**：契约图谱。显式建模模块间的 API、类型、行为、UI 和数据契约。
- **Task Capsule**：任务胶囊。把自然语言需求编译成 agent 可执行合同。
- **Context Lease**：上下文租约。定义子 agent 能读什么、写什么、用哪些工具、使用哪些事实。
- **Agent Timeline**：智能体时间线。展示 agent 执行过程中的结构化事件。
- **Intent Diff**：意图化差异视图。按业务修复、兼容性、测试、文档等意图解释 diff。
- **Evidence Stack**：证据栈。结构化保存命令、测试、日志、CI 和验证证据。
- **Review Packet**：审查证据包。包含任务结果、影响、diff、测试、风险、未验证项和 PR 建议的最终交付报告。
- **Safe Apply**：安全应用。应用 agent 产物前的影响、验证、权限和风险检查。

---

## 24. Final Statement

AgentForge 的目标不是成为另一个会聊天的编辑器，而是成为 AI 时代的工程变更控制台。

它要让 AI coding 从“生成代码”升级为“理解项目、评估影响、受控执行、证据交付”。

这就是 AgentForge 的最终商用产品定义。
