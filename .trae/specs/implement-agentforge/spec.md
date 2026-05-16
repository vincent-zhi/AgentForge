# AgentForge Native 实现规格

## Why
AgentForge 是一款面向真实工程项目的智能体开发工作台，当前项目仅有 PRD 文档和品牌指南，需要从零开始构建完整可用的原生应用。核心价值在于让 AI 编程从"生成代码"升级为"理解项目、评估影响、受控执行、证据交付"。

## What Changes
- 初始化 Electron + React + TypeScript 项目架构
- 实现品牌设计系统（色彩、字体、组件库）
- 实现 Native Workbench 布局框架（Goal Bar、Project Brain Navigator、Task Workspace、Intelligence HUD、Evidence Console）
- 实现 AgentForge Kernel 核心服务层（Project Brain Service、Impact Guard Engine、Contract Graph Engine、Task Capsule Compiler、Context Lease Manager、Agent Runtime、Evidence Pipeline、Memory Governance、Model Gateway）
- 实现 Project Brain 共享项目大脑（代码扫描、模块识别、依赖图构建、事实管理）
- 实现 Impact Guard 变更影响防护（影响半径分析、契约检查、风险评估）
- 实现 Governed Agent Runtime 受控多智能体运行时（Orchestrator、Blackboard 事件、子 agent 管理）
- 实现 Context Lease 上下文租约（权限控制、文件范围、工具限制）
- 实现 Evidence Pipeline 证据化执行流水线（命令追踪、测试日志、审计记录）
- 实现 Review Packet 审查证据包生成
- 实现 Intent Diff 意图化 Diff 视图
- 实现 Safe Apply 安全应用检查门
- 实现 Editor Layer（Monaco Editor 集成、LSP Bridge、Intent Diff Viewer）
- 实现 Developer Runtime（Terminal、Git、Test Runner）
- 实现数据存储层（SQLite、FTS5、图存储）

## Impact
- Affected specs: 全新项目，无既有规格
- Affected code: 从零构建，涉及以下关键系统
  - 前端：Electron 主进程 + 渲染进程、React 组件树、状态管理
  - 内核：Rust kernel（文件索引、Git/worktree、sandbox、权限拦截）
  - 存储：SQLite + FTS5 + 向量存储
  - 代码分析：tree-sitter、ripgrep、TypeScript Compiler API

## ADDED Requirements

### Requirement: 项目初始化与架构搭建
系统 SHALL 提供 Electron + React + TypeScript 的完整项目脚手架，包含主进程、渲染进程、预加载脚本的基础结构，以及构建、开发、测试工具链。

#### Scenario: 开发者启动项目
- **WHEN** 开发者执行项目启动命令
- **THEN** Electron 应用正常启动，显示 AgentForge 工作台主界面

### Requirement: 品牌设计系统
系统 SHALL 提供基于 AgentForge 品牌指南的完整设计系统，包含色彩 token（Forge Black、Graphite、Ember Orange 等）、字体配置（Inter/JetBrains Mono）、基础 UI 组件（Badge、Card、Panel、Timeline 等）。

#### Scenario: 组件使用品牌色彩
- **WHEN** UI 组件渲染风险状态
- **THEN** 高风险使用 Risk Red (#EF4444)，已验证使用 Safe Green (#22C55E)，注意使用 Warning Amber (#F59E0B)

### Requirement: Native Workbench 布局
系统 SHALL 提供四区域工作台布局：左侧 Project Brain Navigator、中间 Task Workspace、右侧 Intelligence HUD、底部 Evidence Console，顶部 Goal Bar。

#### Scenario: 用户打开项目
- **WHEN** 用户在 AgentForge 中打开一个代码仓库
- **THEN** 工作台显示四区域布局，Goal Bar 可输入工程目标

### Requirement: Project Brain Service
系统 SHALL 提供 Project Brain 服务，能够扫描代码库、识别模块与包、构建 import/export 图和模块依赖图、识别 public API 和 exported types、抽取 schema/config 入口、识别测试文件和测试命令、标记高风险目录。

#### Scenario: 扫描 TypeScript 项目
- **WHEN** 用户打开一个 TypeScript monorepo
- **THEN** Project Brain 生成模块列表、依赖图、公共 API 清单、测试映射和风险标记

### Requirement: Project Fact 管理
系统 SHALL 管理 Project Fact 数据对象，每条事实必须包含 id、type、statement、scope、evidence、confidence、status、expiresWhen，支持 candidate/active/stale/rejected/replaced 状态流转。

#### Scenario: 事实状态流转
- **WHEN** agent 推断产生新事实
- **THEN** 事实进入 candidate 状态，只有代码/测试/PR/人工确认才可晋升为 active

### Requirement: Impact Guard Engine
系统 SHALL 提供 Impact Guard 引擎，在 agent 修改代码前分析变更影响半径，包括上游依赖、下游依赖方、触碰的契约、受影响的测试、禁止变更、风险评估和审查重点。

#### Scenario: 中高风险变更分析
- **WHEN** 用户提交一个涉及认证模块的修改任务
- **THEN** Impact Guard 生成 Impact Map，显示上下游依赖、触及契约、必跑测试和风险等级

### Requirement: Contract Graph Engine
系统 SHALL 提供 Contract Graph 引擎，显式建模模块间的 API 契约、类型契约、行为契约、UI 契约和数据契约。

#### Scenario: 契约依赖查询
- **WHEN** Impact Guard 查询某个模块的契约
- **THEN** Contract Graph 返回该模块提供的所有契约及其消费方

### Requirement: Task Capsule Compiler
系统 SHALL 提供 Task Capsule 编译器，将自然语言需求编译为 agent 可执行合同，包含 goal、nonGoals、writable、readonly、forbidden、mustPreserve、requiredTests。

#### Scenario: 从需求生成 Task Capsule
- **WHEN** 用户在 Goal Bar 输入"修复 refresh token 过期后页面静默失败的问题"
- **THEN** 系统生成 Task Capsule，明确可写范围、只读范围、禁止区域和必须保留的契约

### Requirement: Context Lease Manager
系统 SHALL 提供 Context Lease 管理器，为每个子 agent 分配受限上下文和权限，包含 canRead、canWrite、canUseFacts、tools、requiresApprovalFor，支持 active/expired/revoked 状态。

#### Scenario: 子 agent 请求文件访问
- **WHEN** coder-agent 尝试读取 Context Lease 之外的文件
- **THEN** 系统拦截该操作并记录越界事件

### Requirement: Governed Agent Runtime
系统 SHALL 提供受控多智能体运行时，支持 Orchestrator、Architect、Impact、Contract、Search、Coder、Tester、Reviewer、Doc 九种 agent 角色，所有协作通过结构化 Blackboard 事件完成。

#### Scenario: 多 agent 协作执行任务
- **WHEN** Orchestrator 调度任务执行
- **THEN** 各 agent 通过 Blackboard 事件通信，每个 agent 在 Context Lease 范围内执行

### Requirement: Evidence Pipeline
系统 SHALL 提供证据化执行流水线，所有命令、测试、CI、Git 操作、沙箱事件和 agent 日志都进入 Evidence Stack，并可被 Review Packet 引用。

#### Scenario: 命令执行记录
- **WHEN** agent 执行一条测试命令
- **THEN** 命令内容、执行结果、时间戳和 agent 身份被记录到 Evidence Stack

### Requirement: Review Packet 生成
系统 SHALL 在任务完成后生成 Review Packet，包含任务目标、实际结果、改动文件、每个文件的任务意图、Impact Map、触碰契约、测试结果、未验证项、风险等级、是否越界、reviewer focus、PR 建议和 Brain 更新建议。

#### Scenario: 任务完成生成 Review Packet
- **WHEN** 任务执行完成
- **THEN** 系统生成 Review Packet，用户可查看完整审查证据

### Requirement: Intent Diff Viewer
系统 SHALL 提供 Intent Diff 视图，按业务意图（业务修复、兼容性保护、测试覆盖、文档更新、附带重构）组织代码改动，而非普通文件 diff。

#### Scenario: 查看 Intent Diff
- **WHEN** 用户查看任务产生的代码改动
- **THEN** diff 按意图分类展示，每个改动块标注业务意图

### Requirement: Safe Apply Gate
系统 SHALL 在用户应用 diff 前展示 Safe Apply Checklist，检查 Impact Map 是否生成、契约是否检查、worktree 是否隔离、测试是否通过、未验证项是否存在、是否触碰高风险路径。

#### Scenario: Safe Apply 检查
- **WHEN** 用户点击 Apply
- **THEN** 系统展示检查清单，所有项目通过后才允许应用

### Requirement: Monaco Editor 集成
系统 SHALL 集成 Monaco Editor 作为代码编辑组件，支持 LSP Bridge、Intent Diff Viewer、Inline Agent Suggestions、Symbol Navigation。

#### Scenario: 代码编辑
- **WHEN** 用户在 Task Workspace 中打开文件
- **THEN** Monaco Editor 提供语法高亮、代码补全和 LSP 支持

### Requirement: Developer Runtime
系统 SHALL 提供 Terminal、Git、Test Runner 等开发者运行时能力。

#### Scenario: 运行测试
- **WHEN** agent 或用户触发测试运行
- **THEN** Test Runner 执行命令并将结果记录到 Evidence Stack

### Requirement: 数据存储层
系统 SHALL 使用 SQLite 作为主存储，FTS5 用于全文搜索，SQLite edge tables 用于图存储，支持 Project Brain 事实、Impact Map、Task Capsule、Context Lease、Review Packet、Evidence Stack 等数据持久化。

#### Scenario: 事实持久化
- **WHEN** Project Brain 生成新事实
- **THEN** 事实被持久化到 SQLite，支持按模块、类型、置信度查询

### Requirement: 安全与权限
系统 SHALL 默认禁止 agent 读取或修改 .env*、*.pem、*.key、secrets/**、credentials/**、production/**；高风险路径默认需要人工确认；命令分为 Safe/Medium/High 三级；所有 agent 行为必须审计。

#### Scenario: agent 访问敏感文件
- **WHEN** agent 尝试读取 .env 文件
- **THEN** 系统拦截该操作并记录审计日志

## MODIFIED Requirements
无（全新项目）

## REMOVED Requirements
无（全新项目）
