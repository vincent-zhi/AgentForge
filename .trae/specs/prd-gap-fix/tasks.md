# Tasks

- [x] Task 1: 实现 Planned vs Actual Impact 对比机制
  - [x] SubTask 1.1: 在 GuardEngine 中添加 `computeActualImpact(taskId, changedFiles)` 方法，重新分析变更影响
  - [x] SubTask 1.2: 在 GuardEngine 中添加 `compareImpact(planned, actual)` 方法，返回差异报告
  - [x] SubTask 1.3: 在 WorkflowController 的任务完成阶段调用 actual impact 计算和对比
  - [x] SubTask 1.4: 在 ReviewPacket 类型中添加 `plannedVsActual` 字段
  - [x] SubTask 1.5: 在 PacketGenerator 中生成 planned vs actual 对比数据

- [x] Task 2: 实现 Impact Guard 双策略分析
  - [x] SubTask 2.1: 修改 GuardEngine.analyzeImpact 接受 `strategy: 'quick' | 'deep'` 参数
  - [x] SubTask 2.2: 实现 quick 策略：仅模块级依赖图查询和基础契约检查
  - [x] SubTask 2.3: 实现 deep 策略：完整依赖图遍历、契约兼容性检查、风险评估和测试推荐
  - [x] SubTask 2.4: 修改 TaskClassifier 输出对应的推荐策略
  - [x] SubTask 2.5: 修改 WorkflowController 根据 TaskClassifier 结果选择策略

- [x] Task 3: 实现 Agent 审计链路
  - [x] SubTask 3.1: 在 BaseAgent 中添加 `auditLog(action, target, details?)` 方法
  - [x] SubTask 3.2: 在 CoderAgent 的文件修改操作中调用 auditLog
  - [x] SubTask 3.3: 在 ModelGateway.chat 中记录 LLM 调用审计（模型、token、成本）
  - [x] SubTask 3.4: 在 LeaseManager 的权限检查中记录权限违规审计
  - [x] SubTask 3.5: 在 BrainService 的事实变更中记录审计
  - [x] SubTask 3.6: 添加 IPC 通道和 bridge 方法查询审计日志

- [x] Task 4: 实现模型权限强制执行
  - [x] SubTask 4.1: 在 PolicyManager 中添加模型权限配置（allowedModels, localOnlyPaths, maxCostPerTask, allowThirdParty）
  - [x] SubTask 4.2: 在 ModelGateway.chat 中添加权限检查前置拦截
  - [x] SubTask 4.3: 实现单任务成本累计和上限检查
  - [x] SubTask 4.4: 实现目录级本地模型限制检查
  - [x] SubTask 4.5: 添加 PermissionDeniedError 类型
  - [x] SubTask 4.6: 在 Settings 面板中添加模型权限配置 UI

- [x] Task 5: 补全 Evidence Stack CI 收集
  - [x] SubTask 5.1: 在 EvidencePipeline 中添加 CI 证据收集器
  - [x] SubTask 5.2: 在 CIDetector 中添加触发 CI 运行的方法
  - [x] SubTask 5.3: 在 EvidenceConsole UI 中添加 CI 标签页

- [x] Task 6: 实现商业版本功能门控框架
  - [x] SubTask 6.1: 定义 FeatureTier 类型（free/pro/team/enterprise）
  - [x] SubTask 6.2: 定义 FeatureGate 映射表（功能 → 最低版本级别）
  - [x] SubTask 6.3: 实现 FeatureGateService.checkAccess(feature, tier) 方法
  - [x] SubTask 6.4: 在 IPC bridge 中添加版本和功能门控查询
  - [x] SubTask 6.5: 在 UI 组件中集成功能门控（显示升级提示）

- [x] Task 7: 实现 Worktree 隔离默认启用和自动回滚
  - [x] SubTask 7.1: 修改 WorkflowController 在任务执行前默认创建 Worktree
  - [x] SubTask 7.2: 在 Agent 执行失败时自动调用 WorktreeManager.discard
  - [x] SubTask 7.3: 在 Agent 执行成功且 Safe Apply 通过后自动 merge Worktree
  - [x] SubTask 7.4: 添加 Worktree 创建失败的降级处理（在主工作区执行但标记为非隔离）

- [x] Task 8: 实现 Project Brain 批量撤销
  - [x] SubTask 8.1: 在 FactGovernor 中添加 `revertByTaskId(taskId)` 方法
  - [x] SubTask 8.2: 在 BrainService 中添加 `revertTaskUpdates(taskId)` 方法
  - [x] SubTask 8.3: 添加 IPC 通道和 bridge 方法
  - [x] SubTask 8.4: 在 MemoryPanel UI 中添加按任务撤销按钮

- [x] Task 9: 实现 Context Lease 自动过期和动态调整
  - [x] SubTask 9.1: 在 LeaseManager 中添加定时过期检查器
  - [x] SubTask 9.2: Lease 过期时发布 `lease_expired` 事件并更新状态
  - [x] SubTask 9.3: 实现 `requestPermissionEscalation(agentId, resource, reason)` 方法
  - [x] SubTask 9.4: 在 IPC bridge 中添加权限提升请求通道
  - [x] SubTask 9.5: 在 UI 中添加权限提升确认对话框

- [x] Task 10: 实现 Review Packet 越界检测
  - [x] SubTask 10.1: 在 PacketGenerator 中添加 `detectOutOfScopeChanges(capsule, changedFiles)` 方法
  - [x] SubTask 10.2: 在 ReviewPacket 类型中为 changedFiles 添加 `outOfScope` 标记
  - [x] SubTask 10.3: 在 Safe Apply 中使用越界检测结果
  - [x] SubTask 10.4: 在 ReviewPacketView UI 中高亮显示越界文件

# Task Dependencies
- [Task 1] depends on [Task 2] (actual impact needs dual strategy)
- [Task 3] depends on nothing (independent)
- [Task 4] depends on nothing (independent)
- [Task 5] depends on nothing (independent)
- [Task 6] depends on nothing (independent)
- [Task 7] depends on nothing (independent)
- [Task 8] depends on nothing (independent)
- [Task 9] depends on nothing (independent)
- [Task 10] depends on [Task 1] (out-of-scope detection needs planned vs actual)
