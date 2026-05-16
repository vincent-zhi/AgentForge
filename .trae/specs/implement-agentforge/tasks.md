# Tasks

## Phase 1: 项目脚手架与基础架构

- [x] Task 1: 初始化 Electron + React + TypeScript 项目
  - [x] SubTask 1.1: 使用 Vite 创建 React + TypeScript 前端项目
  - [x] SubTask 1.2: 集成 Electron 主进程、预加载脚本和渲染进程
  - [x] SubTask 1.3: 配置 electron-builder 打包
  - [x] SubTask 1.4: 配置开发工具链（ESLint、Prettier、TypeScript strict mode）
  - [x] SubTask 1.5: 配置项目目录结构（src/main、src/renderer、src/preload、src/kernel）

- [x] Task 2: 搭建状态管理与 IPC 通信层
  - [x] SubTask 2.1: 集成 Zustand 状态管理
  - [x] SubTask 2.2: 建立 Electron IPC 通信桥（main ↔ renderer）
  - [x] SubTask 2.3: 定义 IPC 通道类型（TypeScript 类型安全）

- [x] Task 3: 搭建数据存储层
  - [x] SubTask 3.1: 集成 better-sqlite3 作为 SQLite 驱动
  - [x] SubTask 3.2: 设计数据库 schema（project_facts、impact_maps、task_capsules、context_leases、review_packets、evidence_stack、audit_logs）
  - [x] SubTask 3.3: 实现数据库迁移机制
  - [x] SubTask 3.4: 实现 FTS5 全文搜索索引
  - [x] SubTask 3.5: 实现基础 Repository 模式数据访问层

## Phase 2: 品牌设计系统与 UI 基础

- [x] Task 4: 实现品牌设计系统
  - [x] SubTask 4.1: 定义色彩 token（Forge Black、Graphite、Ember Orange、Safe Green、Warning Amber、Risk Red 等）
  - [x] SubTask 4.2: 定义字体配置（Inter、JetBrains Mono）
  - [x] SubTask 4.3: 定义间距、圆角、阴影等基础 token
  - [x] SubTask 4.4: 配置 Tailwind CSS 与品牌 token 集成

- [x] Task 5: 实现基础 UI 组件库
  - [x] SubTask 5.1: Badge 组件（Brain Confidence、Impact Level、Risk、Status）
  - [x] SubTask 5.2: Card/Panel 组件
  - [x] SubTask 5.3: Timeline 组件（Agent Timeline 用）
  - [x] SubTask 5.4: TreeView 组件（Project Brain Navigator 用）
  - [x] SubTask 5.5: CodeBlock/DiffView 组件
  - [x] SubTask 5.6: CommandPalette 组件
  - [x] SubTask 5.7: StatusBar 组件
  - [x] SubTask 5.8: IconButton、Chip、Tag 等原子组件

## Phase 3: Native Workbench 布局

- [x] Task 6: 实现 Workbench 主布局框架
  - [x] SubTask 6.1: 实现 Goal Bar 顶部栏
  - [x] SubTask 6.2: 实现三栏可调整布局（左-中-右）
  - [x] SubTask 6.3: 实现底部 Evidence Console 可折叠面板
  - [x] SubTask 6.4: 实现面板拖拽调整大小
  - [x] SubTask 6.5: 实现布局状态持久化

- [x] Task 7: 实现 Project Brain Navigator（左侧面板）
  - [x] SubTask 7.1: 项目概览视图（模块列表、契约数、测试数、风险标记）
  - [x] SubTask 7.2: 模块树视图（包/目录结构）
  - [x] SubTask 7.3: 契约列表视图
  - [x] SubTask 7.4: API 列表视图
  - [x] SubTask 7.5: 测试映射视图
  - [x] SubTask 7.6: 决策记录视图
  - [x] SubTask 7.7: 记忆/事实搜索视图（FTS5）

- [x] Task 8: 实现 Task Workspace（中间面板）
  - [x] SubTask 8.1: 任务创建与 Spec 展示视图
  - [x] SubTask 8.2: Monaco Editor 集成
  - [x] SubTask 8.3: Intent Diff Viewer
  - [x] SubTask 8.4: Review Packet 展示视图
  - [x] SubTask 8.5: 预览面板

- [x] Task 9: 实现 Intelligence HUD（右侧面板）
  - [x] SubTask 9.1: Impact Guard 面板
  - [x] SubTask 9.2: Risk Radar 面板
  - [x] SubTask 9.3: Agent Timeline 面板
  - [x] SubTask 9.4: Context Lease 面板
  - [x] SubTask 9.5: Evidence Stack 面板
  - [x] SubTask 9.6: Brain Updates 面板

- [x] Task 10: 实现 Evidence Console（底部面板）
  - [x] SubTask 10.1: Terminal 集成（xterm.js）
  - [x] SubTask 10.2: 测试结果视图
  - [x] SubTask 10.3: 日志视图
  - [x] SubTask 10.4: Git 状态视图
  - [x] SubTask 10.5: 沙箱状态视图

## Phase 4: AgentForge Kernel 核心服务

- [x] Task 11: 实现 Project Brain Service
  - [x] SubTask 11.1: 项目扫描器（文件树、package.json、tsconfig 识别）
  - [x] SubTask 11.2: 模块识别器（monorepo workspace、包边界识别）
  - [x] SubTask 11.3: 依赖图构建器（import/export 图、模块依赖图）
  - [x] SubTask 11.4: 公共 API 提取器（exported types、public functions、schema）
  - [x] SubTask 11.5: 测试映射器（测试文件识别、测试命令提取）
  - [x] SubTask 11.6: 风险标记器（高风险目录识别）
  - [x] SubTask 11.7: Project Fact CRUD 与状态流转
  - [x] SubTask 11.8: 事实过期机制（文件变更触发 stale）
  - [x] SubTask 11.9: 增量更新机制

- [x] Task 12: 实现 Contract Graph Engine
  - [x] SubTask 12.1: 契约类型定义（API、Type、Behavior、UI、Data）
  - [x] SubTask 12.2: 契约提取器（从代码、类型定义、API route 提取契约）
  - [x] SubTask 12.3: 契约消费方分析
  - [x] SubTask 12.4: 契约兼容性检查
  - [x] SubTask 12.5: 契约图谱存储与查询

- [x] Task 13: 实现 Impact Guard Engine
  - [x] SubTask 13.1: 影响半径计算（上游依赖、下游依赖方）
  - [x] SubTask 13.2: 契约触碰检测
  - [x] SubTask 13.3: 受影响测试推荐
  - [x] SubTask 13.4: 风险评估（risk level 计算、risk reasons 生成）
  - [x] SubTask 13.5: 禁止变更检测
  - [x] SubTask 13.6: 审查重点生成
  - [x] SubTask 13.7: Planned vs Actual Impact 对比

- [x] Task 14: 实现 Task Capsule Compiler
  - [x] SubTask 14.1: 需求解析器（自然语言 → 结构化目标）
  - [x] SubTask 14.2: 可写/只读/禁止范围推导
  - [x] SubTask 14.3: 契约保留约束生成
  - [x] SubTask 14.4: 必跑测试推导
  - [x] SubTask 14.5: Task Capsule 数据对象与持久化

- [x] Task 15: 实现 Context Lease Manager
  - [x] SubTask 15.1: Lease 创建与分配
  - [x] SubTask 15.2: 文件权限检查（canRead、canWrite）
  - [x] SubTask 15.3: 事实使用权限检查（canUseFacts）
  - [x] SubTask 15.4: 工具权限检查
  - [x] SubTask 15.5: 审批流程（requiresApprovalFor）
  - [x] SubTask 15.6: Lease 过期与撤销
  - [x] SubTask 15.7: 越界事件记录

- [x] Task 16: 实现 Governed Agent Runtime
  - [x] SubTask 16.1: Blackboard 事件总线
  - [x] SubTask 16.2: Orchestrator Agent（任务调度、agent 分配）
  - [x] SubTask 16.3: Architect Agent（Spec 生成）
  - [x] SubTask 16.4: Impact Agent（Impact Map 生成）
  - [x] SubTask 16.5: Contract Agent（契约检查）
  - [x] SubTask 16.6: Search Agent（上下文检索）
  - [x] SubTask 16.7: Coder Agent（代码修改）
  - [x] SubTask 16.8: Tester Agent（测试执行）
  - [x] SubTask 16.9: Reviewer Agent（diff 审查）
  - [x] SubTask 16.10: Doc Agent（文档更新）
  - [x] SubTask 16.11: Agent 生命周期管理

- [x] Task 17: 实现 Evidence Pipeline
  - [x] SubTask 17.1: 命令执行追踪
  - [x] SubTask 17.2: 测试结果收集
  - [x] SubTask 17.3: Git 操作追踪
  - [x] SubTask 17.4: Agent 日志采集
  - [x] SubTask 17.5: Evidence Stack 存储
  - [x] SubTask 17.6: Evidence 查询与引用

- [x] Task 18: 实现 Memory Governance
  - [x] SubTask 18.1: 事实置信度管理
  - [x] SubTask 18.2: 事实晋升规则（candidate → active）
  - [x] SubTask 18.3: 事实过期与 stale 标记
  - [x] SubTask 18.4: 事实回滚
  - [x] SubTask 18.5: Memory Update Proposal 生成

- [x] Task 19: 实现 Model Gateway
  - [x] SubTask 19.1: 模型 Provider 抽象层
  - [x] SubTask 19.2: OpenAI/Anthropic API 适配
  - [x] SubTask 19.3: 模型路由策略
  - [x] SubTask 19.4: 成本追踪
  - [x] SubTask 19.5: 上下文大小限制

## Phase 5: 证据化交付

- [x] Task 20: 实现 Intent Diff 系统
  - [x] SubTask 20.1: Diff 生成与解析
  - [x] SubTask 20.2: 意图分类器（业务修复、兼容性保护、测试覆盖、文档更新、附带重构）
  - [x] SubTask 20.3: Intent Diff 渲染组件

- [x] Task 21: 实现 Review Packet 生成器
  - [x] SubTask 21.1: Review Packet 数据聚合
  - [x] SubTask 21.2: 未验证项识别
  - [x] SubTask 21.3: Reviewer Focus 生成
  - [x] SubTask 21.4: PR 建议生成
  - [x] SubTask 21.5: Brain 更新建议生成
  - [x] SubTask 21.6: Review Packet 渲染组件

- [x] Task 22: 实现 Safe Apply Gate
  - [x] SubTask 22.1: Safe Apply Checklist 检查逻辑
  - [x] SubTask 22.2: Worktree 隔离验证
  - [x] SubTask 22.3: 高风险路径检测
  - [x] SubTask 22.4: Safe Apply UI 组件

## Phase 6: Developer Runtime

- [x] Task 23: 实现 Terminal 集成
  - [x] SubTask 23.1: xterm.js 集成
  - [x] SubTask 23.2: PTY 进程管理（node-pty）
  - [x] SubTask 23.3: 命令执行与输出捕获

- [x] Task 24: 实现 Git 集成
  - [x] SubTask 24.1: Git 状态查询（simple-git）
  - [x] SubTask 24.2: Worktree 管理
  - [x] SubTask 24.3: Commit / Branch 操作
  - [x] SubTask 24.4: Diff 查看

- [x] Task 25: 实现 Test Runner
  - [x] SubTask 25.1: 测试命令发现
  - [x] SubTask 25.2: 测试执行与结果解析
  - [x] SubTask 25.3: 测试结果可视化

## Phase 7: 安全与审计

- [x] Task 26: 实现安全与权限系统
  - [x] SubTask 26.1: 敏感文件访问拦截（.env*、*.pem、*.key、secrets/**）
  - [x] SubTask 26.2: 高风险路径确认机制
  - [x] SubTask 26.3: 命令分级（Safe/Medium/High）
  - [x] SubTask 26.4: 审计日志记录

## Phase 8: 端到端工作流集成

- [x] Task 27: 实现完整任务工作流
  - [x] SubTask 27.1: 打开项目 → Project Brain 初始化流程
  - [x] SubTask 27.2: 创建任务 → Task Capsule 编译流程
  - [x] SubTask 27.3: 执行任务 → Agent Runtime 调度流程
  - [x] SubTask 27.4: 完成交付 → Review Packet 生成与 Safe Apply 流程

# Task Dependencies
- Task 2 depends on Task 1
- Task 3 depends on Task 1
- Task 4 depends on Task 1
- Task 5 depends on Task 4
- Task 6 depends on Task 5
- Task 7 depends on Task 6, Task 11
- Task 8 depends on Task 6, Task 20, Task 21
- Task 9 depends on Task 6, Task 13, Task 15, Task 17
- Task 10 depends on Task 6, Task 23, Task 24, Task 25
- Task 11 depends on Task 3
- Task 12 depends on Task 11
- Task 13 depends on Task 11, Task 12
- Task 14 depends on Task 11, Task 13
- Task 15 depends on Task 14
- Task 16 depends on Task 15, Task 19
- Task 17 depends on Task 3
- Task 18 depends on Task 11, Task 17
- Task 19 depends on Task 1
- Task 20 depends on Task 17
- Task 21 depends on Task 13, Task 17, Task 18, Task 20
- Task 22 depends on Task 13, Task 21
- Task 23 depends on Task 1
- Task 24 depends on Task 1
- Task 25 depends on Task 23
- Task 26 depends on Task 15, Task 17
- Task 27 depends on Task 7, Task 8, Task 9, Task 10, Task 16, Task 22
