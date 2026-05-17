# Checklist

## Phase A: IPC 连接层
- [x] 所有 IPC_CHANNELS 在主进程中注册了对应 handler
- [x] 渲染进程通过 bridge.project.scan() 可成功调用 BrainService
- [x] 渲染进程通过 bridge.task.create() 可成功创建 Task Capsule
- [x] 渲染进程通过 bridge.agent.start() 可成功启动 Agent Runtime
- [x] 主进程 Blackboard 事件可推送到渲染进程
- [x] 渲染进程 agent store 可接收实时 Blackboard 事件
- [x] 扫描进度事件可推送到渲染进程

## Phase B: 核心交互
- [x] 用户可通过 Open Project 按钮选择项目目录
- [x] 打开项目后 Project Brain 自动初始化并更新 UI
- [x] 未打开项目时显示欢迎页面
- [x] 欢迎页面显示最近项目列表
- [x] Monaco Editor 可正常加载和编辑文件
- [x] Monaco Editor 使用 AgentForge 暗色主题
- [x] Monaco Editor 支持多标签页编辑
- [x] xterm.js 终端可正常交互
- [x] 终端命令执行输出可正常显示
- [x] 文件监控可检测文件变更
- [x] 文件变更可触发事实过期标记

## Phase C: 用户体验
- [x] 设置面板可正常打开和保存配置
- [x] API Key 可安全存储
- [x] 自定义风险路径可生效
- [x] Toast 通知可正确显示和自动消失
- [x] 关键 agent 事件可触发 Toast 通知
- [x] Ctrl+O 可打开项目选择对话框
- [x] Ctrl+Enter 可提交 Goal Bar
- [x] Ctrl+Shift+P 可打开命令面板
- [x] Ctrl+B 可切换 Brain 面板
- [x] Ctrl+J 可切换 Evidence Console
- [x] 应用菜单栏可正常使用
- [x] Task History 可展示历史任务列表
- [x] 可按状态筛选历史任务
- [x] Review Packet 可导出为 Markdown
- [x] Review Packet 可复制到剪贴板
- [x] Worktree 列表可正常展示
- [x] 可创建和删除 Worktree
