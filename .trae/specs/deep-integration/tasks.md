# Tasks

## Phase A: IPC 连接层 — 让前后端真正通信

- [x] Task A1: 注册完整 IPC Handler
  - [x] SubTask A1.1: 在 electron/main.ts 中注册所有 IPC_CHANNELS 对应的 handler
  - [x] SubTask A1.2: 实现 project:* 系列 handler（open、scan、getFacts、searchFacts、getModules、getDependencyGraph）
  - [x] SubTask A1.3: 实现 impact:* 系列 handler（analyze、getMap、comparePlannedVsActual）
  - [x] SubTask A1.4: 实现 task:* 系列 handler（create、getCapsule、updateStatus、list）
  - [x] SubTask A1.5: 实现 agent:* 系列 handler（start、stop、getStatus、getTimeline、getLeases）
  - [x] SubTask A1.6: 实现 evidence:* 系列 handler（getStack、getTestResults）
  - [x] SubTask A1.7: 实现 review:* 系列 handler（generatePacket、safeApplyCheck、apply）
  - [x] SubTask A1.8: 实现 git:* 系列 handler（status、diff、commit）
  - [x] SubTask A1.9: 实现 runtime:* 系列 handler（executeCommand、runTests）
  - [x] SubTask A1.10: 在 main.ts 启动时调用 initializeKernel()

- [x] Task A2: 实现主进程→渲染进程事件推送
  - [x] SubTask A2.1: 定义事件通道常量（blackboard-event、file-changed、scan-progress、agent-status-change、task-status-change）
  - [x] SubTask A2.2: 在 preload.ts 中暴露 onEvent 监听方法
  - [x] SubTask A2.3: 创建 src/ipc/event-listener.ts — 渲染进程侧事件监听器，自动更新 Zustand store
  - [x] SubTask A2.4: 在 Blackboard 中集成事件推送，agent 发布事件时自动推送到渲染进程
  - [x] SubTask A2.5: 在 BrainService 中集成扫描进度推送

## Phase B: 核心交互 — 让用户能真正使用应用

- [x] Task B1: 实现项目打开对话框与流程
  - [x] SubTask B1.1: 在 Goal Bar 添加"Open Project"按钮
  - [x] SubTask B1.2: 添加 IPC channel project:openDialog，使用 dialog.showOpenDialog
  - [x] SubTask B1.3: 实现打开项目后的完整流程：扫描→识别→图构建→事实生成→更新 store
  - [x] SubTask B1.4: 在 project store 添加 isInitialized 状态

- [x] Task B2: 实现欢迎页面
  - [x] SubTask B2.1: 创建 src/components/welcome/welcome-screen.tsx
  - [x] SubTask B2.2: 欢迎页包含：AgentForge 品牌 Logo、Open Project 按钮、最近项目列表、快速入门指引
  - [x] SubTask B2.3: 在 App.tsx 中根据 project store 的 isInitialized 切换欢迎页/工作台
  - [x] SubTask B2.4: 实现最近项目列表（持久化到 localStorage）

- [x] Task B3: 集成 Monaco Editor
  - [x] SubTask B3.1: 安装 @monaco-editor/react 依赖
  - [x] SubTask B3.2: 创建 src/components/editor/monaco-editor.tsx 组件
  - [x] SubTask B3.3: 配置暗色主题（AgentForge 品牌色）
  - [x] SubTask B3.4: 实现文件打开/保存（通过 IPC 读写文件）
  - [x] SubTask B3.5: 实现多标签页编辑（Tab Bar + 文件标签）
  - [x] SubTask B3.6: 在 Task Workspace 的 Editor 标签页中使用真实 Monaco Editor

- [x] Task B4: 集成 xterm.js 真实终端
  - [x] SubTask B4.1: 安装 @xterm/xterm 和 @xterm/addon-fit 依赖
  - [x] SubTask B4.2: 创建 src/components/terminal/terminal-instance.tsx 组件
  - [x] SubTask B4.3: 添加 IPC channel terminal:create、terminal:write、terminal:onData、terminal:kill
  - [x] SubTask B4.4: 在主进程中使用 node-pty 创建 PTY 进程
  - [x] SubTask B4.5: 在 Evidence Console 的 Terminal 标签页中使用真实 xterm.js

- [x] Task B5: 实现文件监控
  - [x] SubTask B5.1: 安装 chokidar 依赖
  - [x] SubTask B5.2: 创建 src/kernel/project-brain/file-watcher.ts
  - [x] SubTask B5.3: 监控文件变更、新增、删除事件
  - [x] SubTask B5.4: 文件变更时触发 BrainService.markStaleFacts()
  - [x] SubTask B5.5: 文件变更事件推送到渲染进程
  - [x] SubTask B5.6: 支持启动/停止监控

## Phase C: 用户体验 — 让应用更好用

- [x] Task C1: 实现设置/配置系统
  - [x] SubTask C1.1: 创建 settings 数据存储（JSON文件）
  - [x] SubTask C1.2: 创建 src/kernel/settings/settings-service.ts
  - [x] SubTask C1.3: 创建 src/components/settings/settings-panel.tsx（模态对话框）
  - [x] SubTask C1.4: 设置项：模型 API Keys（OpenAI/Anthropic）、默认模型选择、自定义风险路径、命令白名单、主题偏好
  - [x] SubTask C1.5: API Key 安全存储
  - [x] SubTask C1.6: 添加 IPC channel settings:* 系列

- [x] Task C2: 实现通知/Toast 系统
  - [x] SubTask C2.1: 创建 src/components/ui/toast.tsx 组件
  - [x] SubTask C2.2: 创建 src/store/toast-store.ts（通知队列管理）
  - [x] SubTask C2.3: 支持类型：success、warning、error、info
  - [x] SubTask C2.4: 自动消失（可配置时长）+ 手动关闭
  - [x] SubTask C2.5: 在 App.tsx 中挂载 Toast 容器
  - [x] SubTask C2.6: 事件监听器自动将关键事件转为 Toast 通知

- [x] Task C3: 实现键盘快捷键系统
  - [x] SubTask C3.1: 创建 src/hooks/use-keyboard-shortcuts.ts
  - [x] SubTask C3.2: Ctrl+O → 打开项目
  - [x] SubTask C3.3: Ctrl+Enter → 提交 Goal Bar
  - [x] SubTask C3.4: Ctrl+Shift+P → 命令面板
  - [x] SubTask C3.5: Ctrl+B → 切换 Brain 面板
  - [x] SubTask C3.6: Ctrl+J → 切换 Evidence Console
  - [x] SubTask C3.7: Ctrl+1/2/3 → 切换面板焦点
  - [x] SubTask C3.8: Ctrl+, → 打开设置

- [x] Task C4: 实现应用菜单栏
  - [x] SubTask C4.1: 在 electron/main.ts 中创建 Application Menu
  - [x] SubTask C4.2: File 菜单：Open Project、Settings、Exit
  - [x] SubTask C4.3: Edit 菜单：Undo、Redo、Find、Replace
  - [x] SubTask C4.4: View 菜单：Toggle Brain Panel、Toggle Evidence Console、Command Palette
  - [x] SubTask C4.5: Task 菜单：New Task、Run Tests、Export Review Packet
  - [x] SubTask C4.6: Help 菜单：About、Documentation

- [x] Task C5: 实现 Task History 历史面板
  - [x] SubTask C5.1: 创建 src/components/task/task-history.tsx
  - [x] SubTask C5.2: 展示所有任务列表（目标、状态、时间、风险等级）
  - [x] SubTask C5.3: 支持按状态筛选、按时间排序
  - [x] SubTask C5.4: 点击历史任务可查看其 Review Packet
  - [x] SubTask C5.5: 在 Goal Bar 中添加 History 入口

- [x] Task C6: 实现 Review Packet 导出
  - [x] SubTask C6.1: 创建 src/kernel/review-packet/markdown-exporter.ts
  - [x] SubTask C6.2: 将 Review Packet 转换为 Markdown 格式
  - [x] SubTask C6.3: 添加"Export as Markdown"按钮到 Review Packet 视图
  - [x] SubTask C6.4: 支持"Copy to Clipboard"和"Save to File"

- [x] Task C7: 实现 Worktree 可视化管理
  - [x] SubTask C7.1: 在 Evidence Console 的 Git 标签页添加 Worktree 管理区域
  - [x] SubTask C7.2: 展示当前 worktree 列表（路径、分支、状态）
  - [x] SubTask C7.3: 创建 worktree 对话框（输入分支名）
  - [x] SubTask C7.4: 删除 worktree 确认对话框
  - [x] SubTask C7.5: 当前活跃 worktree 高亮标记

# Task Dependencies
- Task A2 depends on Task A1
- Task B1 depends on Task A1
- Task B2 depends on Task B1
- Task B3 depends on Task A1
- Task B4 depends on Task A1
- Task B5 depends on Task A1, Task B1
- Task C1 depends on Task A1
- Task C2 depends on Task A2
- Task C3 depends on Task B1
- Task C4 depends on Task B1
- Task C5 depends on Task A1
- Task C6 depends on Task A1
- Task C7 depends on Task A1
