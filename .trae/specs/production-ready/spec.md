# Production Ready Spec — 让核心工作流端到端可运行

## Why
Phase 1 搭建了骨架，Phase 2 连接了前后端，但核心工作流（打开项目→创建任务→执行任务→交付审查）仍然无法端到端运行。Project Brain 扫描结果没有真正驱动 UI 更新；Goal Bar 提交目标后没有触发完整的 Task Capsule 编译流程；Agent Runtime 的 LLM 调用是空壳；Brain Navigator 没有文件浏览器；缺少 LSP Bridge、Debug Adapter、Package Manager 适配器；Review Packet 的数据流没有真正贯通。本阶段目标是让 PRD 第 22 节定义的 9 步展示顺序真正可运行。

## What Changes
- 实现完整的端到端工作流控制器，串联 Goal Bar → Task Capsule → Agent Runtime → Review Packet → Safe Apply
- 增强 Project Brain 扫描器，支持 TypeScript Compiler API 深度分析
- 实现 Brain Navigator 文件浏览器视图
- 实现 LSP Bridge（TypeScript Language Service）
- 实现 Agent Runtime 的真实 LLM 调用流（通过 Model Gateway）
- 实现 Worktree 自动隔离（任务执行时自动创建 worktree）
- 实现增量扫描和 Brain 更新 UI
- 实现任务状态机（draft → planning → executing → reviewing → completed/failed）
- 实现 Agent 执行进度可视化（步骤指示器）
- 实现 Inline Agent Suggestions（Monaco Editor 中的 AI 建议）
- 实现 Debug Adapter Bridge 基础
- 实现 Package Manager Adapter（npm/pnpm/yarn 检测和操作）
- 实现 CI 状态检测
- 实现 Project Brain 决策记录（ADR）管理
- 实现团队规则和项目约束管理
- 实现搜索和替换功能
- 实现拖放文件打开

## Impact
- Affected specs: implement-agentforge, deep-integration
- Affected code:
  - src/kernel/project-brain/ — 增强扫描器
  - src/kernel/agent-runtime/ — 真实 LLM 调用
  - src/kernel/workflow/ — 端到端工作流控制器
  - src/components/brain/ — 文件浏览器
  - src/components/task/ — 任务状态机和进度
  - src/components/editor/ — LSP Bridge 和 Inline Suggestions
  - src/components/hud/ — 实时更新
  - 新增多个文件

## ADDED Requirements

### Requirement: 端到端工作流控制器
系统 SHALL 提供端到端工作流控制器，当用户在 Goal Bar 提交目标后，自动执行：需求解析 → Impact 分析 → Task Capsule 编译 → 用户确认 Plan → Agent 执行 → Evidence 收集 → Review Packet 生成 → Safe Apply 检查。每一步的输出驱动 UI 更新。

#### Scenario: 用户提交目标后完整流程
- **WHEN** 用户在 Goal Bar 输入"修复 refresh token 过期后页面静默失败的问题"并提交
- **THEN** 系统依次执行：解析需求→生成 Impact Map→编译 Task Capsule→展示 Plan 供确认→执行 Agent→生成 Review Packet

### Requirement: 任务状态机
系统 SHALL 实现完整任务状态机：draft → planning → executing → reviewing → completed/failed/cancelled，每个状态转换触发 UI 更新和事件推送。

#### Scenario: 任务状态流转
- **WHEN** Task Capsule 编译完成
- **THEN** 任务从 draft 变为 planning，UI 展示 Plan 供确认

### Requirement: Brain Navigator 文件浏览器
系统 SHALL 在 Brain Navigator 中添加 Files 标签页，展示项目文件树，支持点击打开文件到 Monaco Editor。

#### Scenario: 浏览文件
- **WHEN** 用户在 Brain Navigator 的 Files 标签页点击文件
- **THEN** 文件在 Monaco Editor 中打开

### Requirement: LSP Bridge
系统 SHALL 提供 LSP Bridge，通过 TypeScript Language Service 提供代码补全、类型检查、跳转定义、查找引用等语言智能功能。

#### Scenario: 代码补全
- **WHEN** 用户在 Monaco Editor 中输入代码
- **THEN** LSP Bridge 提供 TypeScript 类型的代码补全建议

### Requirement: Agent 真实 LLM 调用
系统 SHALL 让 Agent Runtime 通过 Model Gateway 真实调用 LLM API，每个 agent 的 execute 方法使用 LLM 生成输出，而非返回占位数据。

#### Scenario: Architect Agent 生成 Spec
- **WHEN** Orchestrator 调度 Architect Agent
- **THEN** Architect Agent 通过 Model Gateway 调用 LLM 生成任务 Spec

### Requirement: Worktree 自动隔离
系统 SHALL 在任务执行时自动创建 Git worktree 隔离环境，任务完成后可选择合并或丢弃。

#### Scenario: 任务执行自动创建 worktree
- **WHEN** 用户确认 Plan 开始执行
- **THEN** 系统自动创建 worktree，agent 在隔离环境中修改代码

### Requirement: 增量扫描与 Brain 更新 UI
系统 SHALL 在文件变更后自动触发增量扫描，更新受影响的 Project Brain 事实，并在 Brain Updates 面板实时展示变更。

#### Scenario: 文件变更触发增量更新
- **WHEN** 文件监控检测到文件变更
- **THEN** 系统增量更新受影响的事实，Brain Updates 面板展示更新内容

### Requirement: Agent 执行进度可视化
系统 SHALL 在 Task Workspace 中展示 Agent 执行进度指示器，显示当前执行步骤、已完成步骤和预计剩余步骤。

#### Scenario: 查看 Agent 执行进度
- **WHEN** Agent 正在执行任务
- **THEN** Task Workspace 显示步骤进度条和当前步骤描述

### Requirement: Inline Agent Suggestions
系统 SHALL 在 Monaco Editor 中提供 Inline Agent Suggestions，当用户在编辑器中请求 AI 建议时，显示内联代码建议。

#### Scenario: 请求 AI 建议
- **WHEN** 用户在编辑器中按 Ctrl+I
- **THEN** 编辑器在光标位置显示 AI 生成的代码建议

### Requirement: Package Manager Adapter
系统 SHALL 检测项目使用的包管理器（npm/pnpm/yarn），并提供包安装、脚本运行等操作。

#### Scenario: 检测包管理器
- **WHEN** 项目打开后
- **THEN** 系统识别 pnpm-lock.yaml / yarn.lock / package-lock.json 并确定包管理器

### Requirement: CI 状态检测
系统 SHALL 检测项目中的 CI 配置（GitHub Actions、GitLab CI 等），并在 Evidence Console 中展示 CI 状态。

#### Scenario: 检测 GitHub Actions
- **WHEN** 项目包含 .github/workflows/ 目录
- **THEN** Evidence Console 的 CI 标签页展示 workflow 列表

### Requirement: 决策记录（ADR）管理
系统 SHALL 在 Brain Navigator 的 Decisions 标签页中支持创建、查看和管理架构决策记录。

#### Scenario: 创建决策记录
- **WHEN** 用户点击"New Decision"
- **THEN** 系统创建 ADR 模板，用户可填写决策内容

### Requirement: 团队规则和项目约束管理
系统 SHALL 支持在 Settings 中配置团队规则和项目约束，包括自定义风险路径、禁止变更规则、命令白名单、模型权限策略。

#### Scenario: 配置团队规则
- **WHEN** 管理员在 Settings 的"团队规则"部分添加规则
- **THEN** 规则被持久化并在 Impact Guard 和 Context Lease 中生效

### Requirement: 搜索和替换
系统 SHALL 在 Monaco Editor 中提供全局搜索和替换功能，支持正则表达式和文件过滤。

#### Scenario: 全局搜索
- **WHEN** 用户按 Ctrl+Shift+F
- **THEN** 系统打开全局搜索面板，输入关键词后展示匹配结果

### Requirement: 拖放文件打开
系统 SHALL 支持将文件从 Brain Navigator 拖放到 Monaco Editor 中打开。

#### Scenario: 拖放文件
- **WHEN** 用户将 Brain Navigator 中的文件拖到编辑器区域
- **THEN** 文件在编辑器中打开

## MODIFIED Requirements
无

## REMOVED Requirements
无
