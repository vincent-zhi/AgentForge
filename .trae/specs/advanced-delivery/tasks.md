# Tasks

## Phase G: 交付闭环 — 让任务真正可交付

- [x] Task G1: Create PR 和 Commit Message 生成
  - [x] SubTask G1.1: 创建 src/kernel/delivery/commit-generator.ts — 基于 Review Packet 生成 commit message
  - [x] SubTask G1.2: 创建 src/kernel/delivery/pr-generator.ts — 基于 Review Packet 生成 PR title、body、labels
  - [x] SubTask G1.3: 创建 src/kernel/delivery/pr-creator.ts — 通过 Git 推送分支并创建 Pull Request（GitHub API）
  - [x] SubTask G1.4: 在 IPC channels 添加 DELIVERY 通道（generate_commit、generate_pr、create_pr）
  - [x] SubTask G1.5: 在 main.ts 注册 DELIVERY IPC handlers
  - [x] SubTask G1.6: 在 bridge.ts 添加 delivery 方法
  - [x] SubTask G1.7: 在 Review Packet 视图添加"Create PR"和"Generate Commit"按钮
  - [x] SubTask G1.8: 创建 src/components/task/pr-create-dialog.tsx — PR 创建确认对话框

- [x] Task G2: Memory Update Proposal 系统
  - [x] SubTask G2.1: 增强 src/kernel/memory-governance/fact-governor.ts — 添加 generateUpdateProposals 方法
  - [x] SubTask G2.2: 实现 proposal 生成逻辑：分析代码变更→识别受影响事实→生成 create/update/stale/reject proposal
  - [x] SubTask G2.3: 实现 proposal 审查流程：用户可逐条接受/拒绝
  - [x] SubTask G2.4: 在 IPC channels 添加 MEMORY 通道（generate_proposals、apply_proposal、reject_proposal）
  - [x] SubTask G2.5: 在 main.ts 注册 MEMORY IPC handlers
  - [x] SubTask G2.6: 在 bridge.ts 添加 memory 方法
  - [x] SubTask G2.7: 创建 src/components/task/memory-proposal-dialog.tsx — Memory Update Proposal 审查对话框
  - [x] SubTask G2.8: 在 task-store 添加 proposals 状态和操作方法
  - [x] SubTask G2.9: 在 Task Deliver Workflow 中自动调用 generateUpdateProposals

- [x] Task G3: Brain Navigator Memory 标签页
  - [x] SubTask G3.1: 创建 src/components/brain/memory-panel.tsx — 项目记忆管理面板
  - [x] SubTask G3.2: 实现事实列表展示（type、statement、confidence、status）
  - [x] SubTask G3.3: 实现筛选功能（按 type、confidence、status）
  - [x] SubTask G3.4: 实现 candidate 事实审查操作（accept → active、reject → rejected）
  - [x] SubTask G3.5: 实现 stale 事实刷新操作（重新扫描并更新）
  - [x] SubTask G3.6: 在 brain-navigator.tsx 添加 Memory 标签页

- [x] Task G4: Task Workspace Preview 标签页
  - [x] SubTask G4.1: 创建 src/components/task/preview-panel.tsx — 代码变更预览面板
  - [x] SubTask G4.2: 展示改动文件列表，支持逐文件查看 diff
  - [x] SubTask G4.3: 集成 DiffView 组件展示文件改动
  - [x] SubTask G4.4: 在 task-workspace.tsx 添加 Preview 标签页

## Phase H: 编辑器与开发者运行时增强

- [x] Task H1: Symbol Navigation
  - [x] SubTask H1.1: 创建 src/kernel/lsp/symbol-provider.ts — 符号提取和索引
  - [x] SubTask H1.2: 实现文件内符号列表（functions、classes、interfaces、types、enums）
  - [x] SubTask H1.3: 实现全项目符号搜索（基于 Project Brain 扫描结果）
  - [x] SubTask H1.4: 在 IPC channels 添加 LSP.SYMBOLS 和 LSP.WORKSPACE_SYMBOLS 通道
  - [x] SubTask H1.5: 在 main.ts 注册符号相关 IPC handlers
  - [x] SubTask H1.6: 在 Monaco Editor 中集成 Ctrl+Shift+O（文件符号）和 Ctrl+T（工作区符号）
  - [x] SubTask H1.7: 创建 src/components/editor/symbol-picker.tsx — 符号选择器 UI

- [x] Task H2: Debug Adapter Protocol Bridge
  - [x] SubTask H2.1: 创建 src/kernel/debug/debug-bridge.ts — DAP 适配器基础
  - [x] SubTask H2.2: 实现 Node.js 调试会话管理（启动、停止、断点）
  - [x] SubTask H2.3: 实现调试事件转发（断点命中、变量更新、调用栈变更）
  - [x] SubTask H2.4: 在 IPC channels 添加 DEBUG 通道（start、stop、set_breakpoint、continue、step_over、step_into、step_out）
  - [x] SubTask H2.5: 在 main.ts 注册 DEBUG IPC handlers
  - [x] SubTask H2.6: 在 bridge.ts 添加 debug 方法
  - [x] SubTask H2.7: 创建 src/components/debug/debug-panel.tsx — 调试面板（变量、调用栈、断点）
  - [x] SubTask H2.8: 创建 src/store/debug-store.ts — 调试状态管理
  - [x] SubTask H2.9: 在 Evidence Console 添加 Debug 标签页
  - [x] SubTask H2.10: 在 Monaco Editor 中集成断点设置（行号点击）

- [x] Task H3: Sandbox Runner
  - [x] SubTask H3.1: 创建 src/kernel/sandbox/sandbox-runner.ts — 沙箱执行器基础
  - [x] SubTask H3.2: 实现 Docker 容器管理（创建、启动、停止、删除）
  - [x] SubTask H3.3: 实现 DevContainer 配置解析（.devcontainer/devcontainer.json）
  - [x] SubTask H3.4: 实现沙箱内命令执行和输出捕获
  - [x] SubTask H3.5: 在 IPC channels 添加 SANDBOX 通道（create、execute、stop、status）
  - [x] SubTask H3.6: 在 main.ts 注册 SANDBOX IPC handlers
  - [x] SubTask H3.7: 在 bridge.ts 添加 sandbox 方法
  - [x] SubTask H3.8: 在 Evidence Console 的 Sandbox 标签页集成沙箱状态展示

## Phase I: UX 优化与视觉完整性

- [x] Task I1: 轻量任务路径
  - [x] SubTask I1.1: 创建 src/kernel/workflow/task-classifier.ts — 任务复杂度分类器
  - [x] SubTask I1.2: 实现分类逻辑：根据目标范围、涉及文件数、契约影响判断任务等级（lightweight/standard/strict）
  - [x] SubTask I1.3: 增强 workflow-controller.ts — lightweight 任务跳过 Impact Guard 深度分析和 Plan 确认
  - [x] SubTask I1.4: 增强 Review Packet 生成 — lightweight 任务生成简化 Review Packet
  - [x] SubTask I1.5: 在 Goal Bar 展示任务等级标签（轻量/标准/严格）

- [x] Task I2: 渐进披露 UI
  - [x] SubTask I2.1: 创建 src/components/hud/progressive-disclosure.tsx — 渐进披露容器组件
  - [x] SubTask I2.2: 实现低风险视图：仅展示目标、改动文件和测试结果摘要
  - [x] SubTask I2.3: 实现中风险视图：展示 Impact Map 和测试结果详情
  - [x] SubTask I2.4: 实现高风险视图：展示完整 Evidence Stack、Contract 检查和 Safe Apply Checklist
  - [x] SubTask I2.5: 在 Intelligence HUD 中集成渐进披露逻辑

- [x] Task I3: 视觉完整性
  - [x] SubTask I3.1: 创建 src/components/ui/stale-fact-badge.tsx — Stale Fact Warning 组件
  - [x] SubTask I3.2: 创建 src/components/ui/contract-lock-icon.tsx — Contract Lock Icon 组件
  - [x] SubTask I3.3: 创建 src/components/ui/intent-label.tsx — Intent Diff Label 组件
  - [x] SubTask I3.4: 创建 src/components/ui/evidence-checkmark.tsx — Evidence Checkmark 组件
  - [x] SubTask I3.5: 增强 Brain Confidence Badge — 添加置信度动画和过期提示
  - [x] SubTask I3.6: 在 Brain Navigator 中集成 Stale Fact Warning
  - [x] SubTask I3.7: 在 Contract List 中集成 Contract Lock Icon
  - [x] SubTask I3.8: 在 Intent Diff Viewer 中集成 Intent Labels
  - [x] SubTask I3.9: 在 Evidence Stack Panel 中集成 Evidence Checkmarks

## Phase J: 生产就绪

- [x] Task J1: 性能优化和缓存
  - [x] SubTask J1.1: 创建 src/kernel/cache/lru-cache.ts — 通用 LRU 缓存实现
  - [x] SubTask J1.2: 在 BrainService 中集成缓存（扫描结果、模块列表、事实查询）
  - [x] SubTask J1.3: 在 GuardEngine 中集成缓存（Impact Map 分析结果）
  - [x] SubTask J1.4: 在 GraphEngine 中集成缓存（契约查询结果）
  - [x] SubTask J1.5: 实现缓存失效策略（文件变更时清除相关缓存）
  - [x] SubTask J1.6: 优化数据库查询（添加缺失索引、批量查询优化）

- [x] Task J2: Electron 应用打包
  - [x] SubTask J2.1: 配置 electron-builder（package.json build 配置）
  - [x] SubTask J2.2: 配置 macOS 打包（dmg、代码签名）
  - [x] SubTask J2.3: 配置 Windows 打包（nsis）
  - [x] SubTask J2.4: 配置 Linux 打包（AppImage）
  - [x] SubTask J2.5: 配置自动更新（electron-updater）
  - [x] SubTask J2.6: 添加应用图标和启动画面配置
  - [x] SubTask J2.7: 添加 build 和 dist npm scripts

- [x] Task J3: 多项目支持
  - [x] SubTask J3.1: 增强 project-store.ts — 支持多项目状态管理
  - [x] SubTask J3.2: 实现项目切换逻辑（保存当前项目状态、加载目标项目状态）
  - [x] SubTask J3.3: 增强最近项目列表（持久化到 settings、展示项目名称和路径）
  - [x] SubTask J3.4: 在 Welcome Screen 展示最近项目列表（增强版）
  - [x] SubTask J3.5: 在 Goal Bar 添加项目切换下拉菜单
  - [x] SubTask J3.6: 在菜单栏添加项目切换选项

- [x] Task J4: Activity Center 活动中心
  - [x] SubTask J4.1: 创建 src/store/activity-store.ts — 活动事件状态管理
  - [x] SubTask J4.2: 创建 src/components/activity/activity-center.tsx — 活动中心面板
  - [x] SubTask J4.3: 实现活动事件列表（agent 事件、任务状态变更、风险警告、系统通知）
  - [x] SubTask J4.4: 实现按类型筛选和时间排序
  - [x] SubTask J4.5: 实现点击活动跳转到相关面板
  - [x] SubTask J4.6: 在 Workbench Layout 添加 Activity Center 入口（铃铛图标）
  - [x] SubTask J4.7: 集成 Blackboard 事件到 Activity Center

- [x] Task J5: Plugin/Extension 系统基础
  - [x] SubTask J5.1: 创建 src/kernel/plugin/plugin-registry.ts — 插件注册中心
  - [x] SubTask J5.2: 定义插件接口（IAnalyzerPlugin、IContractExtractorPlugin、ITestSelectorPlugin、IReviewPolicyPlugin）
  - [x] SubTask J5.3: 创建 src/kernel/plugin/plugin-loader.ts — 插件加载器（从配置文件加载）
  - [x] SubTask J5.4: 在 BrainService 中集成 analyzer 插件调用
  - [x] SubTask J5.5: 在 GraphEngine 中集成 contract extractor 插件调用
  - [x] SubTask J5.6: 创建 .agentforge/plugins.json 配置文件格式定义
  - [x] SubTask J5.7: 在 Settings 面板添加插件管理标签页

# Task Dependencies
- Task G2 depends on Task G1
- Task G3 depends on Task G2
- Task G4 depends on Task G1
- Task H1 depends on Task G1
- Task H2 depends on Task H1
- Task H3 depends on Task H2
- Task I1 depends on Task G1
- Task I2 depends on Task I1
- Task I3 depends on Task G3, Task G4
- Task J1 depends on Task G1, Task H1
- Task J2 depends on Task J1
- Task J3 depends on Task G1
- Task J4 depends on Task G2
- Task J5 depends on Task J1
