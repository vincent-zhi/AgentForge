# Checklist

## Task 1: Planned vs Actual Impact 对比
- [ ] GuardEngine.computeActualImpact 方法可基于实际变更文件重新计算影响
- [ ] GuardEngine.compareImpact 方法可对比 planned 和 actual impact 并返回差异
- [ ] WorkflowController 在任务完成后调用 actual impact 计算
- [ ] ReviewPacket 类型包含 plannedVsActual 字段
- [ ] PacketGenerator 生成 planned vs actual 对比数据

## Task 2: Impact Guard 双策略
- [ ] GuardEngine.analyzeImpact 接受 strategy 参数
- [ ] quick 策略仅执行模块级查询，跳过深度分析
- [ ] deep 策略执行完整分析流程
- [ ] TaskClassifier 输出推荐策略
- [ ] WorkflowController 根据任务分类选择策略

## Task 3: Agent 审计链路
- [ ] BaseAgent.auditLog 方法记录审计事件
- [ ] CoderAgent 文件修改操作记录审计
- [ ] ModelGateway LLM 调用记录审计（模型、token、成本）
- [ ] LeaseManager 权限违规记录审计
- [ ] BrainService 事实变更记录审计
- [ ] IPC 通道可查询审计日志

## Task 4: 模型权限强制执行
- [ ] PolicyManager 支持模型权限配置
- [ ] ModelGateway.chat 在调用前检查权限
- [ ] 单任务成本累计和上限检查生效
- [ ] 目录级本地模型限制检查生效
- [ ] PermissionDeniedError 类型定义
- [ ] Settings 面板可配置模型权限

## Task 5: Evidence Stack CI 收集
- [ ] EvidencePipeline 收集 CI 证据
- [ ] CIDetector 可触发 CI 运行
- [ ] Evidence Console CI 标签页展示 CI 状态

## Task 6: 商业版本功能门控
- [ ] FeatureTier 类型定义（free/pro/team/enterprise）
- [ ] FeatureGate 映射表定义完整
- [ ] FeatureGateService.checkAccess 方法正确判断权限
- [ ] IPC bridge 支持版本和功能门控查询
- [ ] UI 组件在功能受限时显示升级提示

## Task 7: Worktree 隔离默认启用
- [ ] 任务执行前默认创建 Worktree
- [ ] Agent 执行失败时自动丢弃 Worktree
- [ ] Agent 执行成功后自动合并 Worktree
- [ ] Worktree 创建失败时有降级处理

## Task 8: Project Brain 批量撤销
- [ ] FactGovernor.revertByTaskId 方法可按任务回滚事实
- [ ] BrainService.revertTaskUpdates 方法可按任务撤销更新
- [ ] IPC 通道支持批量撤销操作
- [ ] MemoryPanel UI 有按任务撤销按钮

## Task 9: Context Lease 自动过期
- [ ] LeaseManager 定时检查 Lease 过期
- [ ] Lease 过期时发布 lease_expired 事件
- [ ] 权限提升请求方法可用
- [ ] IPC bridge 支持权限提升请求
- [ ] UI 有权限提升确认对话框

## Task 10: Review Packet 越界检测
- [ ] PacketGenerator.detectOutOfScopeChanges 方法可检测越界变更
- [ ] ReviewPacket changedFiles 包含 outOfScope 标记
- [ ] Safe Apply 使用越界检测结果
- [ ] ReviewPacketView UI 高亮越界文件
