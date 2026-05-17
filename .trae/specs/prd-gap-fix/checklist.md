# Checklist

## Task 1: Planned vs Actual Impact 对比
- [x] GuardEngine.computeActualImpact 方法可基于实际变更文件重新计算影响
- [x] GuardEngine.compareImpact 方法可对比 planned 和 actual impact 并返回差异
- [x] WorkflowController 在任务完成后调用 actual impact 计算
- [x] ReviewPacket 类型包含 plannedVsActual 字段
- [x] PacketGenerator 生成 planned vs actual 对比数据

## Task 2: Impact Guard 双策略
- [x] GuardEngine.analyzeImpact 接受 strategy 参数
- [x] quick 策略仅执行模块级查询，跳过深度分析
- [x] deep 策略执行完整分析流程
- [x] TaskClassifier 输出推荐策略
- [x] WorkflowController 根据任务分类选择策略

## Task 3: Agent 审计链路
- [x] BaseAgent.auditLog 方法记录审计事件
- [x] CoderAgent 文件修改操作记录审计
- [x] ModelGateway LLM 调用记录审计（模型、token、成本）
- [x] LeaseManager 权限违规记录审计
- [x] BrainService 事实变更记录审计
- [x] IPC 通道可查询审计日志

## Task 4: 模型权限强制执行
- [x] PolicyManager 支持模型权限配置
- [x] ModelGateway.chat 在调用前检查权限
- [x] 单任务成本累计和上限检查生效
- [x] 目录级本地模型限制检查生效
- [x] PermissionDeniedError 类型定义
- [x] Settings 面板可配置模型权限

## Task 5: Evidence Stack CI 收集
- [x] EvidencePipeline 收集 CI 证据
- [x] CIDetector 可触发 CI 运行
- [x] Evidence Console CI 标签页展示 CI 状态

## Task 6: 商业版本功能门控
- [x] FeatureTier 类型定义（free/pro/team/enterprise）
- [x] FeatureGate 映射表定义完整
- [x] FeatureGateService.checkAccess 方法正确判断权限
- [x] IPC bridge 支持版本和功能门控查询
- [x] UI 组件在功能受限时显示升级提示

## Task 7: Worktree 隔离默认启用
- [x] 任务执行前默认创建 Worktree
- [x] Agent 执行失败时自动丢弃 Worktree
- [x] Agent 执行成功后自动合并 Worktree
- [x] Worktree 创建失败时有降级处理

## Task 8: Project Brain 批量撤销
- [x] FactGovernor.revertByTaskId 方法可按任务回滚事实
- [x] BrainService.revertTaskUpdates 方法可按任务撤销更新
- [x] IPC 通道支持批量撤销操作
- [x] MemoryPanel UI 有按任务撤销按钮

## Task 9: Context Lease 自动过期
- [x] LeaseManager 定时检查 Lease 过期
- [x] Lease 过期时发布 lease_expired 事件
- [x] 权限提升请求方法可用
- [x] IPC bridge 支持权限提升请求
- [x] UI 有权限提升确认对话框

## Task 10: Review Packet 越界检测
- [x] PacketGenerator.detectOutOfScopeChanges 方法可检测越界变更
- [x] ReviewPacket changedFiles 包含 outOfScope 标记
- [x] Safe Apply 使用越界检测结果
- [x] ReviewPacketView UI 高亮越界文件
