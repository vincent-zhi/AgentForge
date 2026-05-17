# Advanced Delivery & Production Spec — 完成交付闭环与生产就绪

## Why
Phase 1-3 实现了完整的骨架、集成和生产就绪能力，但 PRD 中多个关键功能仍未实现：交付流程缺少 Create PR 和 Commit Message 生成；Brain Navigator 缺少 Memory 标签页；Task Workspace 缺少 Preview 标签页；编辑器缺少 Symbol Navigation；Developer Runtime 缺少 Debug Adapter Bridge 和 Sandbox Runner；小任务流程过重缺少轻量路径；视觉元素缺少 Stale Fact Warning 和 Contract Lock Icon；应用缺少 Electron 打包配置和多项目支持；性能缺少缓存和优化。本阶段目标是完成 PRD 定义的完整产品形态，让 AgentForge 从"功能完整"升级为"生产可用"。

## What Changes
- 实现 Create PR 和 Commit Message 生成，完成交付闭环
- 实现 Memory Update Proposal 系统，完成 Brain 治理闭环
- 在 Brain Navigator 添加 Memory 标签页，展示项目记忆管理
- 在 Task Workspace 添加 Preview 标签页，展示代码预览
- 实现 Symbol Navigation，支持符号搜索和导航
- 实现 Debug Adapter Protocol Bridge 基础
- 实现 Sandbox Runner（Docker/DevContainer 适配器）
- 实现轻量任务路径，小任务自动跳过重型流程
- 实现渐进披露 UI，根据任务复杂度展示不同信息层级
- 实现视觉完整性（Stale Fact Warning、Contract Lock Icon、Intent Diff Labels）
- 实现性能优化和缓存（LRU 缓存、查询优化、增量计算）
- 实现 Electron 应用打包和分发配置
- 实现多项目支持（项目切换、最近项目管理）
- 实现 Activity Center 活动中心（统一通知和事件流）
- 实现 Plugin/Extension 系统基础框架

## Impact
- Affected specs: implement-agentforge, deep-integration, production-ready
- Affected code:
  - src/kernel/workflow/ — 交付工作流增强
  - src/kernel/memory-governance/ — Memory Update Proposal
  - src/kernel/runtime/ — Sandbox Runner, Debug Adapter
  - src/components/brain/ — Memory 标签页
  - src/components/task/ — Preview 标签页
  - src/components/editor/ — Symbol Navigation
  - src/components/ui/ — Stale Fact Warning, Contract Lock Icon
  - src/kernel/project-brain/ — 缓存优化
  - electron/main.ts — 新增 IPC handlers
  - src/ipc/channels.ts — 新增通道
  - 新增多个文件

## ADDED Requirements

### Requirement: Create PR 和 Commit Message 生成
系统 SHALL 在任务完成后自动生成 commit message 和 PR description，基于 Review Packet 中的 Intent Diff、Impact Map 和 Evidence Stack。用户可选择 Create PR（推送到远程仓库并创建 Pull Request）或仅生成 commit。

#### Scenario: 任务完成后生成 PR
- **WHEN** 用户在 Review Packet 视图点击"Create PR"
- **THEN** 系统基于 Review Packet 生成 PR title、body 和 labels，通过 Git 推送分支并创建 Pull Request

### Requirement: Memory Update Proposal 系统
系统 SHALL 在任务完成后自动生成 Memory Update Proposal，包含新事实创建、已有事实更新、过期事实标记为 stale、错误事实拒绝。每个 proposal 必须包含原因和证据。用户可审查并接受/拒绝每个 proposal。

#### Scenario: 任务完成后生成 Memory Update Proposal
- **WHEN** 任务执行完成并生成 Review Packet
- **THEN** 系统分析代码变更和执行结果，生成 Memory Update Proposal 列表

### Requirement: Memory 标签页
系统 SHALL 在 Brain Navigator 中添加 Memory 标签页，展示项目记忆（Project Facts）的管理视图，支持按类型、置信度、状态筛选，支持手动审查 candidate 事实，支持标记 stale 事实。

#### Scenario: 管理项目记忆
- **WHEN** 用户在 Brain Navigator 切换到 Memory 标签页
- **THEN** 展示所有项目事实，支持筛选和状态操作

### Requirement: Preview 标签页
系统 SHALL 在 Task Workspace 中添加 Preview 标签页，展示当前任务产生的代码变更预览，包括文件改动前后的对比视图。

#### Scenario: 预览代码变更
- **WHEN** 用户在 Task Workspace 切换到 Preview 标签页
- **THEN** 展示所有改动文件的预览，支持逐文件查看 diff

### Requirement: Symbol Navigation
系统 SHALL 在 Monaco Editor 中提供 Symbol Navigation，支持通过 Ctrl+Shift+O 跳转到文件内的符号（函数、类、接口、类型），支持通过 Ctrl+T 在全项目搜索符号。

#### Scenario: 跳转到符号
- **WHEN** 用户按 Ctrl+Shift+O
- **THEN** 展示当前文件的符号列表，选择后跳转到对应位置

### Requirement: Debug Adapter Protocol Bridge
系统 SHALL 提供 Debug Adapter Protocol Bridge，支持启动调试会话、设置断点、单步执行、查看变量。初始版本支持 Node.js 调试。

#### Scenario: 启动调试
- **WHEN** 用户在编辑器中按 F5
- **THEN** 系统启动 Node.js 调试会话，在 Debug 面板展示变量和调用栈

### Requirement: Sandbox Runner
系统 SHALL 提供 Sandbox Runner，支持 Docker 容器隔离执行和 DevContainer 集成。Agent 可在沙箱环境中安全执行命令和运行测试。

#### Scenario: 在沙箱中运行测试
- **WHEN** Agent 需要运行测试且项目配置了 DevContainer
- **THEN** 系统在 Docker 容器中执行测试，收集结果到 Evidence Stack

### Requirement: 轻量任务路径
系统 SHALL 为低风险小任务提供轻量执行路径，自动跳过 Impact Guard 深度分析和 Plan 确认步骤，直接执行并生成简化 Review Packet。任务风险等级由系统根据变更范围自动判断。

#### Scenario: 小任务自动走轻量路径
- **WHEN** 用户提交的目标仅涉及单文件修改且无契约影响
- **THEN** 系统自动跳过 Impact Guard 深度分析，直接执行并生成简化 Review Packet

### Requirement: 渐进披露 UI
系统 SHALL 根据任务复杂度和风险等级渐进披露信息：低风险任务仅展示关键摘要，中风险任务展示 Impact Map 和测试结果，高风险任务展示完整的 Evidence Stack、Contract 检查和 Safe Apply Checklist。

#### Scenario: 低风险任务信息展示
- **WHEN** 任务风险等级为 low
- **THEN** 仅展示任务目标、改动文件和测试结果摘要

### Requirement: 视觉完整性
系统 SHALL 实现 PRD 第 18 节定义的所有关键视觉元素：Stale Fact Warning（过期事实警告图标）、Contract Lock Icon（契约锁定图标）、Intent Diff Labels（意图分类标签）、Evidence Checkmarks（证据验证勾选）、Brain Confidence Badge 增强。

#### Scenario: 过期事实警告
- **WHEN** Project Brain 中的事实被标记为 stale
- **THEN** 在 Brain Navigator 和 HUD 中显示 Stale Fact Warning 图标

### Requirement: 性能优化和缓存
系统 SHALL 实现 LRU 缓存层，缓存 Project Brain 扫描结果、Impact Guard 分析结果和频繁查询的数据库结果。支持增量计算，文件变更仅重新计算受影响的部分。

#### Scenario: 重复查询缓存命中
- **WHEN** 用户多次查询同一模块的 Impact Map
- **THEN** 第二次查询从缓存返回，响应时间显著降低

### Requirement: Electron 应用打包
系统 SHALL 配置 electron-builder 进行应用打包，支持 macOS（dmg）、Windows（nsis）和 Linux（AppImage）三平台分发。包含自动更新配置和代码签名。

#### Scenario: 构建 macOS 应用
- **WHEN** 开发者执行构建命令
- **THEN** 生成可分发的 dmg 安装包

### Requirement: 多项目支持
系统 SHALL 支持同时管理多个项目，用户可在项目之间快速切换，每个项目维护独立的 Project Brain 和任务历史。最近项目列表持久化到设置。

#### Scenario: 切换项目
- **WHEN** 用户从最近项目列表选择另一个项目
- **THEN** 系统切换到目标项目，加载对应的 Project Brain 和任务历史

### Requirement: Activity Center 活动中心
系统 SHALL 提供 Activity Center，统一展示所有 agent 事件、任务状态变更、风险警告和系统通知。支持按类型筛选、按时间排序、点击跳转到相关面板。

#### Scenario: 查看 Agent 活动
- **WHEN** 用户打开 Activity Center
- **THEN** 展示最近的 agent 活动、任务完成通知和风险警告

### Requirement: Plugin/Extension 系统基础
系统 SHALL 提供 Plugin/Extension 基础框架，支持注册自定义 analyzer、contract extractor、test selector 和 review policy。插件通过配置文件声明式注册。

#### Scenario: 注册自定义 analyzer
- **WHEN** 开发者在项目配置中声明自定义 analyzer 插件
- **THEN** Project Brain 在扫描时调用该 analyzer 并整合其结果

## MODIFIED Requirements
无

## REMOVED Requirements
无
