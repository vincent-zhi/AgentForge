# AgentForge Work Detail — 文件依赖、设计决策与后续关联

本文档记录 AgentForge 项目中每个关键文件的创建原因、依赖关系和后续联系。

---

## Phase 1: 项目脚手架与基础架构

### package.json
- **依赖**: 无（项目根）
- **为什么这么做**: 项目入口配置文件，定义所有依赖、脚本和元数据。Electron + React + TypeScript 项目的基础。
- **后续联系**: 所有其他文件都依赖此文件中声明的依赖项。Vite 用于构建，electron-builder 用于打包，better-sqlite3 用于存储。

### electron/main.ts
- **依赖**: electron, package.json
- **为什么这么做**: Electron 主进程入口，负责创建 BrowserWindow、管理应用生命周期、注册 IPC handler。这是整个桌面应用的起点。
- **后续联系**: 所有 IPC 通信的注册端；启动时初始化 SQLite 数据库、Project Brain Service 等核心服务。

### electron/preload.ts
- **依赖**: electron
- **为什么这么做**: 预加载脚本，安全地暴露主进程 API 给渲染进程。通过 contextBridge 暴露受控的 IPC 方法，避免直接暴露 node 能力。
- **后续联系**: 渲染进程中所有与主进程的通信都通过此文件暴露的 API。

### src/main.tsx
- **依赖**: react, react-dom, vite
- **为什么这么做**: React 渲染进程入口，挂载根组件 App。Vite 作为构建工具提供 HMR 和快速构建。
- **后续联系**: 所有 React 组件树的起点。

### src/App.tsx
- **依赖**: src/main.tsx, WorkbenchLayout, Zustand stores
- **为什么这么做**: 根组件，组合 Workbench 布局和全局状态 provider。
- **后续联系**: 承载整个工作台 UI 结构。

### src/ipc/bridge.ts
- **依赖**: electron/preload.ts
- **为什么这么做**: 类型安全的 IPC 通信桥，定义所有 renderer → main 的通道和方法。确保两端类型一致。
- **后续联系**: 所有 Kernel 服务的调用都通过此桥，包括 Project Brain 查询、Impact Guard 请求、Agent 调度等。

### src/ipc/channels.ts
- **依赖**: 无
- **为什么这么做**: 集中定义 IPC 通道名称和类型，避免字符串硬编码和类型不一致。
- **后续联系**: bridge.ts 和 main.ts 中的 IPC handler 都引用此文件。

### src/store/index.ts
- **依赖**: zustand
- **为什么这么做**: Zustand 状态管理入口，导出所有 store。Zustand 轻量、TypeScript 友好、无 boilerplate。
- **后续联系**: 所有 UI 组件通过 store 读写状态，包括项目状态、任务状态、agent 状态等。

### src/store/project-store.ts
- **依赖**: zustand, src/ipc/bridge.ts
- **为什么这么做**: 管理项目相关状态（当前项目、Project Brain 数据、扫描状态等）。通过 IPC 与主进程的 Project Brain Service 通信。
- **后续联系**: Project Brain Navigator 组件消费此 store。

### src/store/task-store.ts
- **依赖**: zustand, src/ipc/bridge.ts
- **为什么这么做**: 管理任务相关状态（当前任务、Task Capsule、执行状态等）。
- **后续联系**: Task Workspace 组件消费此 store。

### src/store/agent-store.ts
- **依赖**: zustand, src/ipc/bridge.ts
- **为什么这么做**: 管理 agent 运行时状态（活跃 agent、Context Lease、Blackboard 事件等）。
- **后续联系**: Intelligence HUD 组件消费此 store。

### src/db/schema.ts
- **依赖**: better-sqlite3
- **为什么这么做**: 定义 SQLite 数据库 schema，包括所有核心数据表的 DDL。集中管理 schema 确保一致性。
- **后续联系**: 所有 Repository 类依赖此 schema 创建的表结构。

### src/db/migrations.ts
- **依赖**: src/db/schema.ts
- **为什么这么做**: 数据库迁移机制，支持 schema 版本升级。使用简单的版本号 + SQL 文件方式。
- **后续联系**: 主进程启动时调用迁移。

### src/db/connection.ts
- **依赖**: better-sqlite3
- **为什么这么做**: SQLite 连接管理，单例模式，确保主进程中只有一个数据库连接。
- **后续联系**: 所有 Repository 类通过此连接执行 SQL。

### src/db/repositories/project-fact-repo.ts
- **依赖**: src/db/connection.ts, src/db/schema.ts
- **为什么这么做**: Project Fact 数据访问层，封装 CRUD、状态流转、FTS5 搜索等数据库操作。
- **后续联系**: Project Brain Service 通过此 repo 持久化事实。

### src/db/repositories/impact-map-repo.ts
- **依赖**: src/db/connection.ts, src/db/schema.ts
- **为什么这么做**: Impact Map 数据访问层。
- **后续联系**: Impact Guard Engine 通过此 repo 持久化影响分析结果。

### src/db/repositories/task-capsule-repo.ts
- **依赖**: src/db/connection.ts, src/db/schema.ts
- **为什么这么做**: Task Capsule 数据访问层。
- **后续联系**: Task Capsule Compiler 通过此 repo 持久化任务胶囊。

### src/db/repositories/context-lease-repo.ts
- **依赖**: src/db/connection.ts, src/db/schema.ts
- **为什么这么做**: Context Lease 数据访问层。
- **后续联系**: Context Lease Manager 通过此 repo 持久化租约。

### src/db/repositories/evidence-repo.ts
- **依赖**: src/db/connection.ts, src/db/schema.ts
- **为什么这么做**: Evidence Stack 数据访问层。
- **后续联系**: Evidence Pipeline 通过此 repo 持久化证据。

### src/db/repositories/audit-log-repo.ts
- **依赖**: src/db/connection.ts, src/db/schema.ts
- **为什么这么做**: 审计日志数据访问层。
- **后续联系**: 安全系统通过此 repo 记录所有 agent 行为。

---

## Phase 2: 品牌设计系统与 UI 基础

### src/theme/tokens.ts
- **依赖**: 无
- **为什么这么做**: 集中定义品牌色彩、字体、间距等设计 token。作为所有 UI 组件的单一真相源，确保品牌一致性。
- **后续联系**: Tailwind 配置、所有组件引用此文件的 token。

### src/theme/colors.ts
- **依赖**: src/theme/tokens.ts
- **为什么这么做**: 品牌色彩定义，严格按照品牌指南：Forge Black #0B0D10、Graphite #1A1D22、Ember Orange #FF7A1A 等。
- **后续联系**: Badge、Risk Radar、Impact Guard 等组件使用语义色彩。

### tailwind.config.ts
- **依赖**: src/theme/tokens.ts, tailwindcss
- **为什么这么做**: 将品牌 token 集成到 Tailwind，使组件可直接使用 `bg-forge-black`、`text-ember-orange` 等类名。
- **后续联系**: 所有使用 Tailwind 的组件。

### src/components/ui/badge.tsx
- **依赖**: src/theme/colors.ts, React
- **为什么这么做**: Badge 是 AgentForge 最核心的 UI 元素之一，用于 Brain Confidence、Impact Level、Risk、Status 等状态展示。品牌指南要求所有创新能力必须作为第一视觉层级存在。
- **后续联系**: Project Brain Navigator、Impact Guard 面板、Agent Timeline 等大量使用。

### src/components/ui/card.tsx
- **依赖**: src/theme/tokens.ts, React
- **为什么这么做**: Card/Panel 是工作台面板的基础容器组件，用于 Project Brain、Impact Guard、Context Lease 等面板。
- **后续联系**: 所有面板组件的基础。

### src/components/ui/timeline.tsx
- **依赖**: src/theme/tokens.ts, React
- **为什么这么做**: Timeline 组件用于 Agent Timeline 展示，是品牌核心 UI 资产之一。展示 agent 执行过程中的结构化事件。
- **后续联系**: Intelligence HUD 中的 Agent Timeline 面板。

### src/components/ui/tree-view.tsx
- **依赖**: React
- **为什么这么做**: TreeView 用于 Project Brain Navigator 的模块树、文件树展示。需要支持展开/折叠、图标、状态标记。
- **后续联系**: Project Brain Navigator 的模块视图、文件视图。

### src/components/ui/diff-view.tsx
- **依赖**: React, diff
- **为什么这么做**: DiffView 是 Intent Diff 的基础渲染组件，支持并排/统一视图、语法高亮、意图标注。
- **后续联系**: Intent Diff Viewer 组件。

### src/components/ui/command-palette.tsx
- **依赖**: React
- **为什么这么做**: Command Palette 提供快速命令访问，符合工程级工具的用户期望。
- **后续联系**: 全局快捷键触发。

### src/components/ui/status-bar.tsx
- **依赖**: src/theme/tokens.ts, React
- **为什么这么做**: 底部状态栏，显示项目状态、agent 状态、风险等级等关键信息。
- **后续联系**: Workbench 布局底部。

---

## Phase 3: Native Workbench 布局

### src/components/workbench/workbench-layout.tsx
- **依赖**: src/components/ui/card.tsx, src/store/project-store.ts
- **为什么这么做**: 工作台主布局组件，实现四区域布局（左-中-右-底）。这是用户看到的第一个界面，必须体现品牌心智：左边项目、中间任务、右边 AI 判断、底部证据。
- **后续联系**: 承载所有面板组件。

### src/components/workbench/goal-bar.tsx
- **依赖**: src/store/task-store.ts, src/theme/tokens.ts
- **为什么这么做**: Goal Bar 是 AgentForge 的核心交互入口，用户在此输入工程目标。品牌原则"目标优先于文件"的直接体现。
- **后续联系**: 输入触发 Task Capsule 编译流程。

### src/components/workbench/panel-resizer.tsx
- **依赖**: React
- **为什么这么做**: 面板大小调整组件，支持拖拽调整面板宽度/高度。
- **后续联系**: workbench-layout.tsx 中使用。

### src/components/brain/brain-navigator.tsx
- **依赖**: src/store/project-store.ts, src/components/ui/tree-view.tsx, src/components/ui/badge.tsx
- **为什么这么做**: Project Brain Navigator 左侧面板，展示项目大脑的所有信息。品牌核心 UI 资产。
- **后续联系**: 用户通过此面板浏览模块、契约、测试、风险。

### src/components/brain/module-tree.tsx
- **依赖**: src/components/ui/tree-view.tsx, src/store/project-store.ts
- **为什么这么做**: 模块树视图，展示项目的包/目录结构和模块关系。
- **后续联系**: brain-navigator.tsx 的子组件。

### src/components/brain/contract-list.tsx
- **依赖**: src/store/project-store.ts, src/components/ui/badge.tsx
- **为什么这么做**: 契约列表视图，展示模块间的 API、类型、行为契约。
- **后续联系**: brain-navigator.tsx 的子组件。

### src/components/brain/fact-search.tsx
- **依赖**: src/store/project-store.ts, FTS5
- **为什么这么做**: 事实搜索视图，使用 FTS5 全文搜索项目事实。
- **后续联系**: brain-navigator.tsx 的子组件。

### src/components/task/task-workspace.tsx
- **依赖**: src/store/task-store.ts
- **为什么这么做**: Task Workspace 中间面板，展示当前任务的 Spec、代码编辑、Intent Diff、Review Packet。
- **后续联系**: 承载 Monaco Editor、Intent Diff Viewer、Review Packet 视图。

### src/components/task/spec-view.tsx
- **依赖**: src/store/task-store.ts
- **为什么这么做**: 任务 Spec 展示视图，显示 Architect Agent 生成的任务规格。
- **后续联系**: task-workspace.tsx 的子组件。

### src/components/task/review-packet-view.tsx
- **依赖**: src/store/task-store.ts, src/components/ui/badge.tsx
- **为什么这么做**: Review Packet 展示视图，显示最终审查证据包。品牌核心 UI 资产。
- **后续联系**: task-workspace.tsx 的子组件。

### src/components/hud/intelligence-hud.tsx
- **依赖**: src/store/agent-store.ts, src/store/project-store.ts
- **为什么这么做**: Intelligence HUD 右侧面板，展示 AI 如何判断、授权、执行和控制风险。品牌心智"右边是 AI 怎么判断"的直接体现。
- **后续联系**: 承载 Impact Guard、Risk Radar、Agent Timeline、Context Lease、Evidence Stack 面板。

### src/components/hud/impact-guard-panel.tsx
- **依赖**: src/store/project-store.ts, src/components/ui/badge.tsx
- **为什么这么做**: Impact Guard 面板，展示影响半径、触及契约、必跑测试和风险等级。品牌核心 UI 资产。
- **后续联系**: intelligence-hud.tsx 的子组件。

### src/components/hud/risk-radar.tsx
- **依赖**: src/store/project-store.ts
- **为什么这么做**: Risk Radar 风险雷达，展示 auth、API、database、UI、test coverage 等风险维度。品牌核心 UI 资产。
- **后续联系**: intelligence-hud.tsx 的子组件。

### src/components/hud/agent-timeline.tsx
- **依赖**: src/store/agent-store.ts, src/components/ui/timeline.tsx
- **为什么这么做**: Agent Timeline 智能体时间线，展示 agent 执行过程。品牌核心 UI 资产。
- **后续联系**: intelligence-hud.tsx 的子组件。

### src/components/hud/context-lease-panel.tsx
- **依赖**: src/store/agent-store.ts, src/components/ui/badge.tsx
- **为什么这么做**: Context Lease 面板，展示每个 agent 的权限和工具范围。品牌核心 UI 资产。
- **后续联系**: intelligence-hud.tsx 的子组件。

### src/components/hud/evidence-stack-panel.tsx
- **依赖**: src/store/agent-store.ts
- **为什么这么做**: Evidence Stack 面板，汇总测试、日志、CI、验证状态。品牌核心 UI 资产。
- **后续联系**: intelligence-hud.tsx 的子组件。

### src/components/evidence/evidence-console.tsx
- **依赖**: src/store/agent-store.ts
- **为什么这么做**: Evidence Console 底部面板，展示 Terminal、测试结果、日志、Git 状态。品牌心智"底部是所有执行证据"。
- **后续联系**: workbench-layout.tsx 的底部区域。

### src/components/evidence/terminal-panel.tsx
- **依赖**: xterm.js, node-pty
- **为什么这么做**: Terminal 集成，使用 xterm.js 渲染 + node-pty 管理进程。
- **后续联系**: evidence-console.tsx 的子组件。

### src/components/evidence/test-results-panel.tsx
- **依赖**: src/store/agent-store.ts
- **为什么这么做**: 测试结果视图，展示测试执行结果和覆盖率。
- **后续联系**: evidence-console.tsx 的子面板。

---

## Phase 4: AgentForge Kernel 核心服务

### src/kernel/project-brain/scanner.ts
- **依赖**: fs, path, glob
- **为什么这么做**: 项目扫描器，扫描文件树、识别 package.json、tsconfig、语言/框架。是 Project Brain 的入口服务。
- **后续联系**: Project Brain Service 调用此模块初始化项目理解。

### src/kernel/project-brain/module-identifier.ts
- **依赖**: src/kernel/project-brain/scanner.ts
- **为什么这么做**: 模块识别器，识别 monorepo workspace、包边界。理解项目结构的第一步。
- **后续联系**: 依赖图构建器、公共 API 提取器都依赖模块识别结果。

### src/kernel/project-brain/dependency-graph.ts
- **依赖**: src/kernel/project-brain/module-identifier.ts
- **为什么这么做**: 依赖图构建器，构建 import/export 图和模块依赖图。Impact Guard 的核心输入。
- **后续联系**: Impact Guard Engine 使用依赖图计算影响半径。

### src/kernel/project-brain/api-extractor.ts
- **依赖**: src/kernel/project-brain/module-identifier.ts, typescript
- **为什么这么做**: 公共 API 提取器，提取 exported types、public functions、schema。Contract Graph 的数据来源。
- **后续联系**: Contract Graph Engine 使用提取的 API 构建契约。

### src/kernel/project-brain/test-mapper.ts
- **依赖**: src/kernel/project-brain/scanner.ts
- **为什么这么做**: 测试映射器，识别测试文件和测试命令。Impact Guard 推荐必跑测试的数据来源。
- **后续联系**: Impact Guard Engine 使用测试映射推荐受影响测试。

### src/kernel/project-brain/risk-marker.ts
- **依赖**: src/kernel/project-brain/scanner.ts
- **为什么这么做**: 风险标记器，标记高风险目录（auth、payment、database 等）。Safe Apply 的检查输入。
- **后续联系**: Safe Apply Gate 使用风险标记检查高风险路径。

### src/kernel/project-brain/brain-service.ts
- **依赖**: 所有 project-brain 子模块, src/db/repositories/project-fact-repo.ts
- **为什么这么做**: Project Brain Service 主服务，协调扫描、识别、图构建、事实管理等所有子模块。是 Kernel 对外暴露的核心 API。
- **后续联系**: IPC handler 调用此服务；Impact Guard、Task Capsule Compiler 等依赖此服务。

### src/kernel/contract-graph/contract-types.ts
- **依赖**: 无
- **为什么这么做**: 契约类型定义（API、Type、Behavior、UI、Data），是 Contract Graph 的数据模型基础。
- **后续联系**: 所有契约相关模块使用此类型。

### src/kernel/contract-graph/contract-extractor.ts
- **依赖**: src/kernel/contract-graph/contract-types.ts, src/kernel/project-brain/api-extractor.ts
- **为什么这么做**: 契约提取器，从代码、类型定义、API route 提取契约。
- **后续联系**: Contract Graph Engine 使用提取的契约构建图谱。

### src/kernel/contract-graph/consumer-analyzer.ts
- **依赖**: src/kernel/contract-graph/contract-types.ts, src/kernel/project-brain/dependency-graph.ts
- **为什么这么做**: 契约消费方分析，识别每个契约的消费方模块。Impact Guard 判断"谁会受影响"的关键。
- **后续联系**: Impact Guard Engine 使用消费方信息。

### src/kernel/contract-graph/compatibility-checker.ts
- **依赖**: src/kernel/contract-graph/contract-types.ts
- **为什么这么做**: 契约兼容性检查，判断变更是否破坏现有契约。must_preserve 约束的执行器。
- **后续联系**: Impact Guard Engine 和 Safe Apply Gate 使用兼容性检查结果。

### src/kernel/contract-graph/graph-engine.ts
- **依赖**: 所有 contract-graph 子模块, src/db/connection.ts
- **为什么这么做**: Contract Graph Engine 主服务，协调契约提取、消费方分析、兼容性检查。
- **后续联系**: Impact Guard Engine 依赖此服务查询契约信息。

### src/kernel/impact-guard/impact-calculator.ts
- **依赖**: src/kernel/project-brain/dependency-graph.ts, src/kernel/contract-graph/graph-engine.ts
- **为什么这么做**: 影响半径计算，基于依赖图和契约图计算上游依赖、下游依赖方。Impact Guard 的核心算法。
- **后续联系**: Impact Guard Engine 使用计算结果生成 Impact Map。

### src/kernel/impact-guard/risk-assessor.ts
- **依赖**: src/kernel/project-brain/risk-marker.ts
- **为什么这么做**: 风险评估，计算 risk level 和生成 risk reasons。结合项目风险标记和影响范围。
- **后续联系**: Impact Guard Engine 使用评估结果。

### src/kernel/impact-guard/test-recommender.ts
- **依赖**: src/kernel/project-brain/test-mapper.ts, src/kernel/impact-guard/impact-calculator.ts
- **为什么这么做**: 受影响测试推荐，基于影响范围和测试映射推荐必跑测试。
- **后续联系**: Impact Guard Engine 使用推荐结果。

### src/kernel/impact-guard/guard-engine.ts
- **依赖**: 所有 impact-guard 子模块, src/db/repositories/impact-map-repo.ts
- **为什么这么做**: Impact Guard Engine 主服务，协调影响计算、风险评估、测试推荐。是 Kernel 对外暴露的核心 API。
- **后续联系**: IPC handler 调用此服务；Task Capsule Compiler 依赖此服务。

### src/kernel/task-capsule/requirement-parser.ts
- **依赖**: src/kernel/model-gateway/model-gateway.ts
- **为什么这么做**: 需求解析器，使用 LLM 将自然语言需求解析为结构化目标。Task Capsule 编译的第一步。
- **后续联系**: Task Capsule Compiler 使用解析结果。

### src/kernel/task-capsule/scope-deriver.ts
- **依赖**: src/kernel/impact-guard/guard-engine.ts, src/kernel/project-brain/brain-service.ts
- **为什么这么做**: 范围推导器，基于 Impact Map 和 Project Brain 推导可写/只读/禁止范围。
- **后续联系**: Task Capsule Compiler 使用推导结果。

### src/kernel/task-capsule/capsule-compiler.ts
- **依赖**: src/kernel/task-capsule/requirement-parser.ts, src/kernel/task-capsule/scope-deriver.ts, src/db/repositories/task-capsule-repo.ts
- **为什么这么做**: Task Capsule Compiler 主服务，将需求编译为 agent 可执行合同。
- **后续联系**: IPC handler 调用此服务；Agent Runtime 依赖 Task Capsule 定义执行边界。

### src/kernel/context-lease/lease-manager.ts
- **依赖**: src/db/repositories/context-lease-repo.ts, src/kernel/task-capsule/capsule-compiler.ts
- **为什么这么做**: Context Lease Manager 主服务，管理租约创建、权限检查、过期撤销。是 agent 受控执行的核心保障。
- **后续联系**: Agent Runtime 中每个 agent 操作都经过此管理器检查。

### src/kernel/context-lease/permission-checker.ts
- **依赖**: src/kernel/context-lease/lease-manager.ts
- **为什么这么做**: 权限检查器，检查 canRead、canWrite、canUseFacts、tools 权限。拦截越界操作。
- **后续联系**: Agent Runtime 的文件操作和工具调用都经过此检查器。

### src/kernel/agent-runtime/blackboard.ts
- **依赖**: EventEmitter
- **为什么这么做**: Blackboard 事件总线，所有 agent 通过结构化事件通信。品牌原则"不做无约束群聊"的实现。
- **后续联系**: 所有 agent 通过此总线发布和订阅事件。

### src/kernel/agent-runtime/base-agent.ts
- **依赖**: src/kernel/context-lease/lease-manager.ts, src/kernel/agent-runtime/blackboard.ts, src/kernel/model-gateway/model-gateway.ts
- **为什么这么做**: Agent 基类，定义 agent 的生命周期、Context Lease 集成、Blackboard 事件发布。所有 agent 角色继承此类。
- **后续联系**: 所有具体 agent 实现（Orchestrator、Coder 等）继承此类。

### src/kernel/agent-runtime/orchestrator.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts, src/kernel/task-capsule/capsule-compiler.ts
- **为什么这么做**: Orchestrator Agent，负责任务调度和 agent 分配。是 agent 团队的指挥中心。
- **后续联系**: 任务执行流程的入口。

### src/kernel/agent-runtime/architect-agent.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts
- **为什么这么做**: Architect Agent，生成任务 Spec。将用户目标细化为可执行规格。
- **后续联系**: Orchestrator 调度此 agent 生成 Spec。

### src/kernel/agent-runtime/impact-agent.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts, src/kernel/impact-guard/guard-engine.ts
- **为什么这么做**: Impact Agent，生成 Impact Map。结合 LLM 和静态分析。
- **后续联系**: Orchestrator 调度此 agent 分析影响。

### src/kernel/agent-runtime/contract-agent.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts, src/kernel/contract-graph/graph-engine.ts
- **为什么这么做**: Contract Agent，检查契约约束。
- **后续联系**: Orchestrator 调度此 agent 检查契约。

### src/kernel/agent-runtime/search-agent.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts, src/kernel/project-brain/brain-service.ts
- **为什么这么做**: Search Agent，检索相关上下文。在 Project Brain 中搜索相关事实和代码。
- **后续联系**: Orchestrator 调度此 agent 收集上下文。

### src/kernel/agent-runtime/coder-agent.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts
- **为什么这么做**: Coder Agent，在 Context Lease 范围内修改代码。是实际执行代码修改的 agent。
- **后续联系**: Orchestrator 调度此 agent 执行代码修改。

### src/kernel/agent-runtime/tester-agent.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts
- **为什么这么做**: Tester Agent，新增或运行测试。
- **后续联系**: Orchestrator 调度此 agent 执行测试。

### src/kernel/agent-runtime/reviewer-agent.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts
- **为什么这么做**: Reviewer Agent，审查 diff。检查是否越界、是否破坏契约。
- **后续联系**: Orchestrator 调度此 agent 审查代码。

### src/kernel/agent-runtime/doc-agent.ts
- **依赖**: src/kernel/agent-runtime/base-agent.ts
- **为什么这么做**: Doc Agent，更新文档。
- **后续联系**: Orchestrator 调度此 agent 更新文档。

### src/kernel/agent-runtime/agent-runtime.ts
- **依赖**: 所有 agent 实现, src/kernel/agent-runtime/blackboard.ts
- **为什么这么做**: Agent Runtime 主服务，管理 agent 生命周期、调度执行。是 Kernel 对外暴露的核心 API。
- **后续联系**: IPC handler 调用此服务启动任务执行。

### src/kernel/evidence-pipeline/command-tracker.ts
- **依赖**: src/db/repositories/evidence-repo.ts
- **为什么这么做**: 命令执行追踪，记录所有命令内容、结果、时间戳和 agent 身份。
- **后续联系**: Evidence Pipeline 主服务使用此追踪器。

### src/kernel/evidence-pipeline/test-collector.ts
- **依赖**: src/db/repositories/evidence-repo.ts
- **为什么这么做**: 测试结果收集，记录测试命令、通过/失败、覆盖率。
- **后续联系**: Evidence Pipeline 主服务使用此收集器。

### src/kernel/evidence-pipeline/git-tracker.ts
- **依赖**: simple-git, src/db/repositories/evidence-repo.ts
- **为什么这么做**: Git 操作追踪，记录 commit、branch、diff 操作。
- **后续联系**: Evidence Pipeline 主服务使用此追踪器。

### src/kernel/evidence-pipeline/pipeline.ts
- **依赖**: 所有 evidence-pipeline 子模块
- **为什么这么做**: Evidence Pipeline 主服务，协调所有证据收集。
- **后续联系**: Review Packet 生成器引用 Evidence Stack。

### src/kernel/memory-governance/fact-governor.ts
- **依赖**: src/db/repositories/project-fact-repo.ts
- **为什么这么做**: 事实治理器，管理事实置信度、晋升规则、过期机制。品牌原则"记忆必须有证据和过期机制"的实现。
- **后续联系**: Review Packet 生成 Memory Update Proposal 时使用此治理器。

### src/kernel/model-gateway/model-gateway.ts
- **依赖**: openai, @anthropic-ai/sdk
- **为什么这么做**: Model Gateway 主服务，抽象模型 Provider、路由策略、成本追踪。所有 LLM 调用都通过此网关。
- **后续联系**: 所有需要 LLM 的 agent 和服务通过此网关调用模型。

---

## Phase 5: 证据化交付

### src/kernel/intent-diff/diff-generator.ts
- **依赖**: diff
- **为什么这么做**: Diff 生成与解析，生成标准 diff 并解析为结构化数据。
- **后续联系**: Intent Diff 分类器使用生成的 diff。

### src/kernel/intent-diff/intent-classifier.ts
- **依赖**: src/kernel/intent-diff/diff-generator.ts, src/kernel/model-gateway/model-gateway.ts
- **为什么这么做**: 意图分类器，使用 LLM 将 diff 块分类为业务修复、兼容性保护、测试覆盖、文档更新、附带重构。
- **后续联系**: Intent Diff Viewer 使用分类结果渲染。

### src/components/task/intent-diff-viewer.tsx
- **依赖**: src/components/ui/diff-view.tsx, src/kernel/intent-diff/intent-classifier.ts
- **为什么这么做**: Intent Diff 渲染组件，按意图分类展示代码改动。品牌核心 UI 资产。
- **后续联系**: Task Workspace 中的代码改动视图。

### src/kernel/review-packet/packet-generator.ts
- **依赖**: src/kernel/impact-guard/guard-engine.ts, src/kernel/evidence-pipeline/pipeline.ts, src/kernel/memory-governance/fact-governor.ts, src/kernel/intent-diff/intent-classifier.ts
- **为什么这么做**: Review Packet 生成器，聚合所有审查证据生成最终 Review Packet。AgentForge 的最终交付物。
- **后续联系**: Review Packet 视图展示生成结果。

### src/kernel/review-packet/unverified-identifier.ts
- **依赖**: src/kernel/evidence-pipeline/pipeline.ts
- **为什么这么做**: 未验证项识别器，识别未运行的测试、未检查的契约、未验证的假设。
- **后续联系**: Review Packet 生成器使用识别结果。

### src/kernel/safe-apply/apply-gate.ts
- **依赖**: src/kernel/impact-guard/guard-engine.ts, src/kernel/review-packet/packet-generator.ts
- **为什么这么做**: Safe Apply Gate，在应用 diff 前检查所有安全条件。品牌核心功能。
- **后续联系**: 用户 Apply 操作经过此门检查。

### src/components/task/safe-apply-dialog.tsx
- **依赖**: src/kernel/safe-apply/apply-gate.ts, src/components/ui/badge.tsx
- **为什么这么做**: Safe Apply UI 组件，展示检查清单和检查结果。品牌核心 UI 资产。
- **后续联系**: Task Workspace 中的 Apply 操作触发此对话框。

---

## Phase 6: Developer Runtime

### src/kernel/runtime/terminal-manager.ts
- **依赖**: node-pty
- **为什么这么做**: PTY 进程管理，创建和管理终端进程。
- **后续联系**: Terminal 面板通过此管理器交互。

### src/kernel/runtime/git-manager.ts
- **依赖**: simple-git
- **为什么这么做**: Git 操作管理，提供状态查询、worktree 管理、commit/branch 操作。
- **后续联系**: Git 状态视图和 Evidence Pipeline 的 Git 追踪器使用此管理器。

### src/kernel/runtime/test-runner.ts
- **依赖**: src/kernel/project-brain/test-mapper.ts
- **为什么这么做**: 测试运行器，执行测试命令并解析结果。
- **后续联系**: Tester Agent 和 Evidence Pipeline 使用此运行器。

---

## Phase 7: 安全与审计

### src/kernel/security/file-guard.ts
- **依赖**: src/kernel/context-lease/permission-checker.ts
- **为什么这么做**: 文件访问守卫，拦截对敏感文件（.env*、*.pem、*.key、secrets/**）的访问。
- **后续联系**: Agent Runtime 的文件操作经过此守卫。

### src/kernel/security/command-classifier.ts
- **依赖**: 无
- **为什么这么做**: 命令分级器，将命令分为 Safe/Medium/High 三级。
- **后续联系**: Agent Runtime 的命令执行经过此分类器。

### src/kernel/security/audit-logger.ts
- **依赖**: src/db/repositories/audit-log-repo.ts
- **为什么这么做**: 审计日志记录器，记录所有 agent 行为（文件读写、命令执行、模型调用等）。
- **后续联系**: 所有 Kernel 服务的操作都经过此记录器。

---

## Phase 8: 端到端工作流集成

### src/kernel/workflow/project-open-workflow.ts
- **依赖**: src/kernel/project-brain/brain-service.ts
- **为什么这么做**: 打开项目工作流，协调扫描→识别→图构建→事实生成→Brain 初始化。
- **后续联系**: 用户打开项目时触发。

### src/kernel/workflow/task-create-workflow.ts
- **依赖**: src/kernel/task-capsule/capsule-compiler.ts, src/kernel/impact-guard/guard-engine.ts
- **为什么这么做**: 创建任务工作流，协调目标输入→Spec 生成→Impact Map→Task Capsule 编译。
- **后续联系**: 用户在 Goal Bar 输入目标后触发。

### src/kernel/workflow/task-execute-workflow.ts
- **依赖**: src/kernel/agent-runtime/agent-runtime.ts, src/kernel/evidence-pipeline/pipeline.ts
- **为什么这么做**: 执行任务工作流，协调 agent 调度→受控执行→证据收集→Impact 对比。
- **后续联系**: 用户确认 Plan 后触发。

### src/kernel/workflow/task-deliver-workflow.ts
- **依赖**: src/kernel/review-packet/packet-generator.ts, src/kernel/safe-apply/apply-gate.ts, src/kernel/memory-governance/fact-governor.ts
- **为什么这么做**: 交付任务工作流，协调 Review Packet 生成→Safe Apply 检查→Brain 更新。
- **后续联系**: 任务执行完成后触发。

---

## Phase 9: 交付闭环与高级工程能力

### src/kernel/delivery/commit-generator.ts
- **依赖**: src/kernel/review-packet/packet-generator.ts, src/kernel/intent-diff/intent-classifier.ts
- **为什么这么做**: 基于 Review Packet 中的 Intent Diff 和 Impact Map 自动生成 commit message。PRD 第 10 节要求交付流程包含 commit message / PR description 生成。
- **后续联系**: pr-generator.ts 使用 commit message 作为 PR body 的一部分。

### src/kernel/delivery/pr-generator.ts
- **依赖**: src/kernel/delivery/commit-generator.ts, src/kernel/review-packet/packet-generator.ts
- **为什么这么做**: 基于 Review Packet 生成完整的 PR title、body 和 labels。PRD 第 10 节交付流程要求"生成 commit message / PR description"。
- **后续联系**: pr-creator.ts 使用生成的 PR 信息创建远程 Pull Request。

### src/kernel/delivery/pr-creator.ts
- **依赖**: src/kernel/delivery/pr-generator.ts, src/kernel/runtime/git-manager.ts
- **为什么这么做**: 通过 Git 推送分支并调用 GitHub API 创建 Pull Request。PRD 第 10 节要求用户可选择"Create PR"。
- **后续联系**: Review Packet 视图的"Create PR"按钮触发此服务。

### src/components/task/pr-create-dialog.tsx
- **依赖**: src/kernel/delivery/pr-generator.ts, src/components/ui/card.tsx
- **为什么这么做**: PR 创建确认对话框，展示生成的 PR 信息供用户确认。品牌原则"证据优先于描述"的交付环节体现。
- **后续联系**: Review Packet 视图的"Create PR"按钮打开此对话框。

### src/kernel/memory-governance/fact-governor.ts (增强)
- **依赖**: src/kernel/review-packet/packet-generator.ts, src/kernel/project-brain/brain-service.ts
- **为什么这么做**: 增强 Memory Update Proposal 生成逻辑，分析代码变更和执行结果，自动生成事实创建/更新/过期/拒绝提案。PRD 第 10 节要求"生成 memory update proposal"。
- **后续联系**: Task Deliver Workflow 自动调用此增强方法。

### src/components/task/memory-proposal-dialog.tsx
- **依赖**: src/kernel/memory-governance/fact-governor.ts, src/components/ui/badge.tsx
- **为什么这么做**: Memory Update Proposal 审查对话框，用户可逐条审查和接受/拒绝提案。品牌原则"记忆必须有证据和过期机制"的交互体现。
- **后续联系**: 任务完成后自动弹出此对话框。

### src/components/brain/memory-panel.tsx
- **依赖**: src/store/project-store.ts, src/components/ui/badge.tsx, src/components/ui/card.tsx
- **为什么这么做**: Brain Navigator Memory 标签页，展示项目记忆管理视图。PRD 第 8 节工作台设计明确列出 Memory 标签页。
- **后续联系**: brain-navigator.tsx 的 Memory 标签页内容。

### src/components/task/preview-panel.tsx
- **依赖**: src/store/task-store.ts, src/components/ui/diff-view.tsx
- **为什么这么做**: Task Workspace Preview 标签页，展示代码变更预览。PRD 第 8 节工作台设计明确列出 Preview 标签页。
- **后续联系**: task-workspace.tsx 的 Preview 标签页内容。

---

## Phase 10: 编辑器与开发者运行时增强

### src/kernel/lsp/symbol-provider.ts
- **依赖**: src/kernel/lsp/lsp-bridge.ts, src/kernel/project-brain/api-extractor.ts
- **为什么这么做**: 符号提取和索引，支持文件内符号列表和全项目符号搜索。PRD 第 7 节 Editor Layer 明确要求 Symbol Navigation。
- **后续联系**: Monaco Editor 的 Ctrl+Shift+O 和 Ctrl+T 功能使用此服务。

### src/components/editor/symbol-picker.tsx
- **依赖**: src/kernel/lsp/symbol-provider.ts
- **为什么这么做**: 符号选择器 UI，展示符号列表供用户选择跳转。标准 IDE 符号导航体验。
- **后续联系**: Monaco Editor 触发符号导航时弹出此组件。

### src/kernel/debug/debug-bridge.ts
- **依赖**: 无（使用 Node.js inspector API）
- **为什么这么做**: Debug Adapter Protocol Bridge，支持启动调试会话、设置断点、单步执行。PRD 第 7 节 Developer Runtime 明确要求 Debug Adapter Bridge。
- **后续联系**: Debug Panel 和 Monaco Editor 断点功能使用此服务。

### src/components/debug/debug-panel.tsx
- **依赖**: src/store/debug-store.ts, src/components/ui/card.tsx
- **为什么这么做**: 调试面板，展示变量、调用栈和断点列表。标准 IDE 调试体验。
- **后续联系**: Evidence Console 的 Debug 标签页内容。

### src/store/debug-store.ts
- **依赖**: zustand, src/ipc/bridge.ts
- **为什么这么做**: 调试状态管理，管理调试会话状态、断点列表、变量和调用栈。
- **后续联系**: Debug Panel 和 Monaco Editor 断点功能消费此 store。

### src/kernel/sandbox/sandbox-runner.ts
- **依赖**: Docker API（dockerode）
- **为什么这么做**: Sandbox Runner，支持 Docker 容器隔离执行和 DevContainer 集成。PRD 第 7 节 AgentForge Kernel 明确要求 Sandbox Runner，Developer Runtime 要求 DevContainer / Docker Adapter。
- **后续联系**: Agent 在沙箱中执行命令时使用此服务。

---

## Phase 11: UX 优化与视觉完整性

### src/kernel/workflow/task-classifier.ts
- **依赖**: src/kernel/impact-guard/guard-engine.ts, src/kernel/project-brain/brain-service.ts
- **为什么这么做**: 任务复杂度分类器，根据目标范围、涉及文件数、契约影响判断任务等级。PRD 第 20 节 Risk 5 要求"小任务自动走轻量路径"。
- **后续联系**: Workflow Controller 使用分类结果决定执行路径。

### src/components/hud/progressive-disclosure.tsx
- **依赖**: src/store/task-store.ts
- **为什么这么做**: 渐进披露容器组件，根据任务风险等级展示不同信息层级。PRD 第 20 节要求"UI 使用渐进披露"。
- **后续联系**: Intelligence HUD 使用此组件包装各面板。

### src/components/ui/stale-fact-badge.tsx
- **依赖**: src/theme/tokens.ts
- **为什么这么做**: Stale Fact Warning 组件，PRD 第 18 节视觉语言明确要求 Stale Fact warning。
- **后续联系**: Brain Navigator 和 HUD 中的事实展示使用此组件。

### src/components/ui/contract-lock-icon.tsx
- **依赖**: src/theme/tokens.ts
- **为什么这么做**: Contract Lock Icon 组件，PRD 第 18 节视觉语言明确要求 Contract lock icon。
- **后续联系**: Contract List 中的契约展示使用此组件。

### src/components/ui/intent-label.tsx
- **依赖**: src/theme/tokens.ts
- **为什么这么做**: Intent Diff Label 组件，PRD 第 18 节视觉语言明确要求 Intent Diff labels。
- **后续联系**: Intent Diff Viewer 中的意图标注使用此组件。

### src/components/ui/evidence-checkmark.tsx
- **依赖**: src/theme/tokens.ts
- **为什么这么做**: Evidence Checkmark 组件，PRD 第 18 节视觉语言明确要求 Evidence checkmarks。
- **后续联系**: Evidence Stack Panel 中的验证状态展示使用此组件。

---

## Phase 12: 生产就绪

### src/kernel/cache/lru-cache.ts
- **依赖**: 无
- **为什么这么做**: 通用 LRU 缓存实现，用于缓存 Project Brain 扫描结果、Impact Guard 分析结果等频繁查询数据。PRD 第 16 节非功能需求要求性能优化。
- **后续联系**: BrainService、GuardEngine、GraphEngine 集成此缓存。

### electron-builder 配置 (package.json build 字段)
- **依赖**: electron-builder
- **为什么这么做**: Electron 应用打包配置，支持 macOS/Windows/Linux 三平台分发。产品从开发环境到用户可安装应用的必要步骤。
- **后续联系**: CI/CD 构建流水线使用此配置。

### src/store/activity-store.ts
- **依赖**: zustand, src/ipc/bridge.ts
- **为什么这么做**: 活动事件状态管理，统一管理所有 agent 事件、任务状态变更、风险警告和系统通知。
- **后续联系**: Activity Center 面板消费此 store。

### src/components/activity/activity-center.tsx
- **依赖**: src/store/activity-store.ts, src/components/ui/card.tsx
- **为什么这么做**: Activity Center 活动中心面板，统一展示所有事件和通知。PRD 第 7 节 Native Workbench 的通知系统增强。
- **后续联系**: Workbench Layout 中的铃铛图标入口。

### src/kernel/plugin/plugin-registry.ts
- **依赖**: 无
- **为什么这么做**: 插件注册中心，管理自定义 analyzer、contract extractor、test selector 和 review policy 的注册。PRD 第 16 节非功能需求要求"支持多语言 analyzer 插件、自定义 contract extractor、自定义 test selector、自定义 review policy"。
- **后续联系**: BrainService、GraphEngine 通过此注册中心调用插件。

### src/kernel/plugin/plugin-loader.ts
- **依赖**: src/kernel/plugin/plugin-registry.ts
- **为什么这么做**: 插件加载器，从 .agentforge/plugins.json 配置文件加载插件。声明式插件注册，降低扩展门槛。
- **后续联系**: 应用启动时调用此加载器初始化插件。
