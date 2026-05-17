# Deep Integration Spec — 让 AgentForge 真正可运行

## Why
Phase 1 实现了完整的骨架（UI 组件、Kernel 服务、数据存储），但各层之间尚未真正连接。Electron 主进程的 IPC handler 是空的，渲染进程无法调用任何 Kernel 服务；Monaco Editor 和 xterm.js 仅为占位符；没有项目打开对话框、文件监控、设置系统、通知机制和键盘快捷键。本阶段的目标是让 AgentForge 从"代码骨架"升级为"可交互运行的应用"。

## What Changes
- 注册完整 IPC handler，将渲染进程的 bridge 调用连接到 Kernel 服务
- 实现主进程→渲染进程的实时事件推送（Blackboard 事件、文件变更、agent 状态）
- 实现项目打开对话框和项目选择流程
- 集成 Monaco Editor 作为真实代码编辑器
- 集成 xterm.js 作为真实终端
- 实现文件监控（chokidar），文件变更触发 Project Brain 事实过期
- 实现设置/配置系统（模型 API Key、项目偏好、风险路径自定义）
- 实现通知/Toast 系统
- 实现完整键盘快捷键系统
- 实现应用菜单栏
- 实现 Task History 历史记录面板
- 实现 Review Packet 导出（Markdown/PR Description）
- 实现 Worktree 可视化管理

## Impact
- Affected specs: implement-agentforge (Phase 1 骨架)
- Affected code:
  - electron/main.ts — 需要注册所有 IPC handler
  - src/ipc/bridge.ts — 需要增加事件监听 API
  - src/components/task/task-workspace.tsx — Monaco Editor 真实集成
  - src/components/evidence/evidence-console.tsx — xterm.js 真实集成
  - src/components/brain/brain-navigator.tsx — 需要文件浏览器
  - src/kernel/project-brain/brain-service.ts — 需要文件监控
  - 新增多个文件

## ADDED Requirements

### Requirement: IPC Handler 完整注册
系统 SHALL 在 Electron 主进程中注册所有 IPC handler，将渲染进程通过 bridge 发出的每个调用正确路由到对应的 Kernel 服务方法。

#### Scenario: 渲染进程调用 project:scan
- **WHEN** 渲染进程通过 bridge.project.scan(projectPath) 发起调用
- **THEN** 主进程调用 brainService.initializeProject(projectPath) 并返回结果

### Requirement: 主进程→渲染进程实时事件推送
系统 SHALL 支持主进程向渲染进程推送实时事件，包括 Blackboard 事件、文件变更事件、agent 状态变更、扫描进度更新。使用 Electron webContents.send 实现。

#### Scenario: Agent 发布 Blackboard 事件
- **WHEN** Agent Runtime 中的 agent 发布 Blackboard 事件
- **THEN** 渲染进程的 agent store 收到事件并更新 Agent Timeline

### Requirement: 项目打开对话框
系统 SHALL 提供项目打开对话框，用户可选择本地代码仓库目录。打开后自动触发 Project Brain 初始化流程。

#### Scenario: 用户打开项目
- **WHEN** 用户点击"Open Project"或使用快捷键
- **THEN** 系统显示目录选择对话框，选择后触发 Project Brain 扫描

### Requirement: Monaco Editor 真实集成
系统 SHALL 集成 @monaco-editor/react 作为代码编辑器，支持语法高亮、TypeScript 语言服务、代码补全、多标签页编辑。

#### Scenario: 用户在 Task Workspace 中编辑代码
- **WHEN** 用户在 Task Workspace 的 Editor 标签页中打开文件
- **THEN** Monaco Editor 加载文件内容，提供语法高亮和编辑能力

### Requirement: xterm.js 真实终端集成
系统 SHALL 集成 xterm.js + node-pty 作为真实终端，支持 shell 交互、命令执行、输出捕获。

#### Scenario: 用户在 Evidence Console 中使用终端
- **WHEN** 用户切换到 Terminal 标签页
- **THEN** xterm.js 渲染真实 PTY 终端，用户可输入命令并获得输出

### Requirement: 文件监控
系统 SHALL 使用 chokidar 监控项目文件变更，文件修改时自动触发 Project Brain 事实过期标记和增量更新。

#### Scenario: 项目文件被修改
- **WHEN** 监控的文件发生变更
- **THEN** 系统标记相关事实为 stale，并推送文件变更事件到渲染进程

### Requirement: 设置/配置系统
系统 SHALL 提供设置面板，用户可配置模型 API Key、默认模型、项目偏好、自定义风险路径、命令白名单。设置持久化到 SQLite。

#### Scenario: 用户配置 OpenAI API Key
- **WHEN** 用户在设置面板输入 API Key
- **THEN** Key 被安全存储，Model Gateway 可使用该 Key 调用 OpenAI API

### Requirement: 通知/Toast 系统
系统 SHALL 提供通知/Toast 组件，用于展示 agent 事件、任务完成、风险警告等实时通知。通知自动消失，可手动关闭。

#### Scenario: 任务完成通知
- **WHEN** 任务执行完成
- **THEN** 右下角显示 Toast 通知，包含任务结果和风险等级

### Requirement: 键盘快捷键系统
系统 SHALL 提供完整键盘快捷键：Ctrl+O 打开项目、Ctrl+Enter 提交目标、Ctrl+Shift+P 命令面板、Ctrl+B 切换 Brain 面板、Ctrl+J 切换 Evidence Console、Ctrl+1/2/3 切换面板焦点。

#### Scenario: 用户按 Ctrl+O
- **WHEN** 用户按下 Ctrl+O
- **THEN** 系统打开项目选择对话框

### Requirement: 应用菜单栏
系统 SHALL 提供应用菜单栏，包含 File（Open Project、Settings、Exit）、Edit（Undo、Redo、Find）、View（Toggle Panels、Command Palette）、Task（New Task、Run Tests）、Help（About、Documentation）。

#### Scenario: 用户点击 File → Open Project
- **WHEN** 用户通过菜单选择 Open Project
- **THEN** 系统打开项目选择对话框

### Requirement: Task History 历史面板
系统 SHALL 提供任务历史面板，展示所有已完成和进行中的任务，支持按状态筛选、按时间排序、点击查看历史 Review Packet。

#### Scenario: 用户查看历史任务
- **WHEN** 用户打开 Task History 面板
- **THEN** 系统展示任务列表，包含目标、状态、时间、风险等级

### Requirement: Review Packet 导出
系统 SHALL 支持将 Review Packet 导出为 Markdown 格式，可直接用作 PR Description。

#### Scenario: 用户导出 Review Packet
- **WHEN** 用户在 Review Packet 视图点击"Export"
- **THEN** 系统生成 Markdown 格式的 Review Packet 并保存到文件或剪贴板

### Requirement: Worktree 可视化管理
系统 SHALL 在 Evidence Console 的 Git 标签页中提供 Worktree 管理界面，展示当前 worktree 列表，支持创建和删除 worktree。

#### Scenario: 用户创建 Worktree
- **WHEN** 用户点击"New Worktree"
- **THEN** 系统创建新的 Git worktree 并切换到隔离环境

### Requirement: 欢迎页面
系统 SHALL 在未打开项目时显示欢迎页面，包含"Open Project"按钮、最近项目列表、快速入门指引。

#### Scenario: 首次启动应用
- **WHEN** 用户首次启动 AgentForge 且未打开项目
- **THEN** 显示欢迎页面，引导用户打开项目

## MODIFIED Requirements
无

## REMOVED Requirements
无
