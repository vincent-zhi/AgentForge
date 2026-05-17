# Checklist

## Phase G: 交付闭环
- [x] Review Packet 视图包含"Create PR"和"Generate Commit"按钮
- [x] Commit message 基于 Review Packet 自动生成
- [x] PR title、body、labels 基于 Review Packet 自动生成
- [x] Create PR 可推送到远程仓库并创建 Pull Request
- [x] Memory Update Proposal 在任务完成后自动生成
- [x] 用户可逐条审查和接受/拒绝 Memory Update Proposal
- [x] Brain Navigator Memory 标签页展示项目事实管理视图
- [x] Memory 标签页支持按 type、confidence、status 筛选
- [x] candidate 事实可被审查（accept/reject）
- [x] stale 事实可被刷新
- [x] Task Workspace Preview 标签页展示代码变更预览
- [x] Preview 标签页支持逐文件查看 diff

## Phase H: 编辑器与开发者运行时增强
- [x] Ctrl+Shift+O 展示当前文件符号列表
- [x] Ctrl+T 展示全项目符号搜索
- [x] 符号选择后跳转到对应位置
- [x] Debug Adapter Bridge 支持启动 Node.js 调试会话
- [x] 调试面板展示变量、调用栈和断点
- [x] Monaco Editor 行号点击设置断点
- [x] F5 启动调试，调试事件正确转发
- [x] Sandbox Runner 支持 Docker 容器创建和管理
- [x] DevContainer 配置可被解析
- [x] 沙箱内命令执行结果收集到 Evidence Stack
- [x] Evidence Console Sandbox 标签页展示沙箱状态

## Phase I: UX 优化与视觉完整性
- [x] 小任务自动走轻量路径（跳过 Impact Guard 深度分析）
- [x] Goal Bar 展示任务等级标签
- [x] 低风险任务仅展示关键摘要
- [x] 中风险任务展示 Impact Map 和测试结果
- [x] 高风险任务展示完整 Evidence Stack 和 Safe Apply Checklist
- [x] Stale Fact Warning 图标在 Brain Navigator 和 HUD 中正确显示
- [x] Contract Lock Icon 在 Contract List 中正确显示
- [x] Intent Diff Labels 在 Intent Diff Viewer 中正确显示
- [x] Evidence Checkmarks 在 Evidence Stack Panel 中正确显示
- [x] Brain Confidence Badge 包含置信度动画和过期提示

## Phase J: 生产就绪
- [x] LRU 缓存正确缓存 BrainService 扫描结果
- [x] LRU 缓存正确缓存 GuardEngine 分析结果
- [x] 文件变更时相关缓存被正确清除
- [x] 数据库查询性能优化（索引、批量查询）
- [x] electron-builder 配置正确，可构建 macOS dmg
- [x] electron-builder 配置正确，可构建 Windows nsis
- [x] electron-builder 配置正确，可构建 Linux AppImage
- [x] 自动更新配置正确
- [x] 多项目切换正常工作
- [x] 最近项目列表持久化到 settings
- [x] Welcome Screen 展示增强版最近项目列表
- [x] Activity Center 展示所有 agent 事件和系统通知
- [x] Activity Center 支持按类型筛选和按时间排序
- [x] 点击活动可跳转到相关面板
- [x] Plugin Registry 可注册自定义 analyzer
- [x] Plugin Loader 可从配置文件加载插件
- [x] BrainService 正确调用 analyzer 插件
- [x] Settings 面板包含插件管理标签页
