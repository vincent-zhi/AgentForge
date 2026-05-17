# PRD 差距修复 Spec

## Why
当前实现与 PRD 定义的商业产品形态之间存在显著差距：多智能体运行时虽已修复调度断裂问题，但 planned vs actual impact 对比、Impact Guard 双策略、Agent 审计链路、模型权限强制执行、Evidence Stack 完整性、商业版本功能门控等核心能力仍未实现，导致产品无法满足 PRD 第 19 节的验收标准。

## What Changes
- 实现 planned impact vs actual impact 对比机制（PRD §10）
- Impact Guard 支持快速初筛和深度分析两种策略（PRD §16）
- 将 AuditLogger 接入所有 Agent 行为，形成完整审计链路（PRD §12）
- 实现模型权限强制执行：哪些模型可用、哪些目录只能用本地模型、单任务成本上限（PRD §12）
- Evidence Stack 补全 CI 证据收集和沙箱执行证据（PRD §7）
- 实现商业版本功能门控框架（Free/Pro/Team/Enterprise）（PRD §13）
- Worktree 隔离默认启用，任务执行失败时自动回滚（PRD §16）
- Project Brain 更新支持批量撤销（PRD §16）
- Review Packet 增加 planned vs actual impact 对比和越界检测（PRD §8）
- Context Lease 过期自动撤销和权限动态调整（PRD §4）

## Impact
- Affected specs: implement-agentforge, deep-integration, production-ready, advanced-delivery
- Affected code: kernel/impact-guard, kernel/agent-runtime, kernel/security, kernel/evidence-pipeline, kernel/review-packet, kernel/memory-governance, kernel/model-gateway, kernel/safe-apply, kernel/workflow, kernel/context-lease, kernel/project-brain, electron/main.ts, src/ipc/channels.ts, src/ipc/bridge.ts, src/store/

## ADDED Requirements

### Requirement: Planned vs Actual Impact Comparison
系统 SHALL 在任务执行完成后重新计算 actual impact，并与 planned impact 对比，差异项必须在 Review Packet 中标记。

#### Scenario: Actual impact exceeds planned impact
- **WHEN** 任务执行完成后 Coder Agent 修改了 planned impact 之外的文件
- **THEN** 系统重新计算 actual impact，标记超出 planned scope 的变更为 out-of-scope
- **AND** Review Packet 的 `isOutOfScope` 字段为 true
- **AND** Safe Apply 检查中 out-of-scope 检查失败

#### Scenario: Actual impact matches planned impact
- **WHEN** 任务执行完成后所有变更均在 planned scope 内
- **THEN** Review Packet 显示 planned 和 actual impact 一致
- **AND** Safe Apply 检查通过

### Requirement: Impact Guard Dual Strategy
系统 SHALL 支持两种影响分析策略：快速初筛（quick scan）和深度分析（deep analysis）。

#### Scenario: Lightweight task uses quick scan
- **WHEN** TaskClassifier 将任务分类为 lightweight
- **THEN** Impact Guard 仅执行模块级依赖图查询和基础契约检查
- **AND** 分析在 2 秒内完成

#### Scenario: Standard/strict task uses deep analysis
- **WHEN** TaskClassifier 将任务分类为 standard 或 strict
- **THEN** Impact Guard 执行完整依赖图遍历、契约兼容性检查、风险评估和测试推荐
- **AND** 生成完整 Impact Map

### Requirement: Agent Audit Trail
系统 SHALL 记录所有 Agent 行为到审计日志，包括文件读取、文件修改、命令执行、模型调用、Context Lease 变更和 Project Brain 更新。

#### Scenario: Agent reads a file
- **WHEN** Agent 通过 Context Lease 读取文件
- **THEN** AuditLogger 记录 agentId、action=read、target=filePath、timestamp

#### Scenario: Agent modifies a file
- **WHEN** Agent 通过 Context Lease 修改文件
- **THEN** AuditLogger 记录 agentId、action=write、target=filePath、timestamp、diff summary

#### Scenario: Agent calls LLM
- **WHEN** Agent 通过 ModelGateway 调用 LLM
- **THEN** AuditLogger 记录 agentId、action=llm_call、model、tokenCount、cost、timestamp

### Requirement: Model Permission Enforcement
系统 SHALL 强制执行模型权限配置，包括可用模型列表、目录级模型限制、代码片段发送第三方限制和单任务成本上限。

#### Scenario: Agent requests a disallowed model
- **WHEN** Agent 尝试使用策略中未允许的模型
- **THEN** ModelGateway 拒绝请求并返回权限错误
- **AND** AuditLogger 记录权限违规

#### Scenario: Task cost exceeds limit
- **WHEN** 单个任务的累计 LLM 调用成本超过配置上限
- **THEN** ModelGateway 停止后续调用
- **AND** 任务标记为 cost_limit_exceeded

#### Scenario: Sensitive directory requires local model
- **WHEN** Agent 处理的策略标记为敏感目录的文件
- **THEN** ModelGateway 仅允许使用本地模型，禁止将代码片段发送给第三方

### Requirement: Evidence Stack CI Collection
系统 SHALL 收集 CI/CD 执行证据，包括 workflow 触发、运行状态和结果。

#### Scenario: CI workflow detected and tracked
- **WHEN** 项目包含 CI 配置且任务触发了 CI 运行
- **THEN** Evidence Pipeline 记录 CI workflow 名称、状态、持续时间和日志摘要

### Requirement: Commercial Version Feature Gating
系统 SHALL 实现商业版本功能门控框架，支持 Free/Pro/Team/Enterprise 四个版本级别。

#### Scenario: Free version user tries Pro feature
- **WHEN** Free 版本用户尝试使用多 Agent 执行
- **THEN** 系统显示升级提示，阻止功能使用

#### Scenario: Pro version user accesses Pro feature
- **WHEN** Pro 版本用户使用多 Agent 执行
- **THEN** 功能正常可用

### Requirement: Worktree Isolation Default and Auto-Rollback
系统 SHALL 默认为所有任务创建 Worktree 隔离，任务失败时自动丢弃 Worktree。

#### Scenario: Task execution fails
- **WHEN** 任务执行过程中 Agent 抛出不可恢复错误
- **THEN** 系统自动丢弃 Worktree，主工作区不受影响
- **AND** 任务状态标记为 failed

#### Scenario: Task execution succeeds
- **WHEN** 任务执行成功且通过 Safe Apply 检查
- **THEN** 系统将 Worktree 合并回主工作区

### Requirement: Project Brain Batch Revert
系统 SHALL 支持批量撤销 Project Brain 更新，包括按任务 ID 回滚所有相关事实变更。

#### Scenario: Revert all brain updates for a task
- **WHEN** 用户撤销某个任务的所有 Project Brain 更新
- **THEN** 该任务产生的所有事实变更被回滚
- **AND** 被标记为 stale 的事实恢复为 active
- **AND** 被新增的事实被删除

### Requirement: Context Lease Auto-Expiry and Dynamic Adjustment
系统 SHALL 支持 Context Lease 自动过期和权限动态调整。

#### Scenario: Lease expires during task execution
- **WHEN** Context Lease 过期时间到达
- **THEN** Lease 状态变为 expired
- **AND** Agent 的后续文件操作被拒绝
- **AND** 发布 lease_expired 事件

#### Scenario: Dynamic permission escalation
- **WHEN** Agent 需要访问 Lease 范围外的文件
- **THEN** 系统向用户请求权限提升确认
- **AND** 用户确认后 Lease 的 canRead/canWrite 范围扩展

### Requirement: Review Packet Out-of-Scope Detection
系统 SHALL 在 Review Packet 中检测并标记超出任务范围的变更。

#### Scenario: Changes detected outside task scope
- **WHEN** Coder Agent 修改了 Task Capsule writable 范围外的文件
- **THEN** Review Packet 的 changedFiles 中标记该文件为 outOfScope: true
- **AND** Safe Apply 检查中 out-of-scope 检查失败

## MODIFIED Requirements

### Requirement: Impact Guard Engine
Impact Guard Engine SHALL 支持双策略分析模式。`analyzeImpact` 方法接受可选的 `strategy` 参数（'quick' | 'deep'），quick 模式仅执行模块级依赖查询和基础契约检查，deep 模式执行完整分析。默认策略由 TaskClassifier 的分类结果决定。

### Requirement: Model Gateway
Model Gateway SHALL 在每次调用前检查模型权限策略，包括：模型是否在允许列表中、当前目录是否需要本地模型、累计成本是否超过上限。权限检查失败时抛出 `PermissionDeniedError` 而非静默失败。

### Requirement: Safe Apply Gate
Safe Apply Gate SHALL 增加 planned vs actual impact 对比检查。当 actual impact 的变更文件超出 planned impact 范围时，检查失败。

### Requirement: Workflow Controller
Workflow Controller SHALL 在任务执行完成后调用 Impact Guard 重新计算 actual impact，并与 planned impact 对比。差异结果写入 Review Packet。

## REMOVED Requirements

### Requirement: Rust Kernel
**Reason**: Rust Kernel 是长期架构优化目标，当前阶段 TypeScript 实现满足功能验证需求，不影响 PRD 核心差异化能力的交付。
**Migration**: 后续版本中逐步将性能敏感模块（文件索引、Git 操作、sandbox）迁移到 Rust native addon。

### Requirement: LanceDB / sqlite-vss Vector Search
**Reason**: 向量搜索是增强能力，FTS5 全文搜索已满足当前事实检索需求。
**Migration**: 在 Team 版本中引入语义搜索作为增值功能。
