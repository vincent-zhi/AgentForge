# Checklist

## Phase 1: 项目脚手架与基础架构
- [x] Electron 应用可正常启动并显示主界面
- [x] React + TypeScript 渲染进程正常渲染
- [x] 主进程与渲染进程 IPC 通信正常
- [x] Zustand 状态管理可正常读写状态
- [x] SQLite 数据库可正常创建和读写
- [x] 数据库迁移机制可正常执行
- [x] FTS5 全文搜索可正常查询
- [x] Repository 数据访问层可正常 CRUD

## Phase 2: 品牌设计系统与 UI 基础
- [x] 色彩 token 符合品牌指南定义
- [x] 字体配置正确加载 Inter 和 JetBrains Mono
- [x] Tailwind CSS 与品牌 token 正确集成
- [x] Badge 组件可正确显示 Brain Confidence、Impact Level、Risk 状态
- [x] Card/Panel 组件可正常渲染
- [x] Timeline 组件可正确展示事件序列
- [x] TreeView 组件可正确展示树形结构
- [x] CodeBlock/DiffView 组件可正确展示代码差异
- [x] 所有原子组件可正常渲染

## Phase 3: Native Workbench 布局
- [x] Goal Bar 可输入工程目标
- [x] 三栏布局可正常显示和调整大小
- [x] 底部 Evidence Console 可折叠展开
- [x] 面板拖拽调整大小正常工作
- [x] 布局状态可持久化恢复
- [x] Project Brain Navigator 可展示模块列表、契约、API、测试
- [x] Task Workspace 可展示 Spec、Monaco Editor、Intent Diff、Review Packet
- [x] Intelligence HUD 可展示 Impact Guard、Risk Radar、Agent Timeline、Context Lease、Evidence Stack
- [x] Evidence Console 可展示 Terminal、测试结果、日志、Git 状态

## Phase 4: AgentForge Kernel 核心服务
- [x] Project Brain 可扫描代码库并识别模块
- [x] 依赖图可正确构建和查询
- [x] 公共 API 可正确提取
- [x] 测试文件和测试命令可正确识别
- [x] Project Fact 可正确 CRUD 和状态流转
- [x] 事实过期机制可正常触发
- [x] Contract Graph 可正确建模模块间契约
- [x] 契约消费方可正确分析
- [x] Impact Guard 可正确计算影响半径
- [x] 风险评估可正确生成 risk level 和 reasons
- [x] 受影响测试可正确推荐
- [x] Task Capsule 可从需求正确编译
- [x] Context Lease 可正确分配和检查权限
- [x] 越界访问可正确拦截和记录
- [x] Blackboard 事件总线可正常通信
- [x] Orchestrator 可正确调度 agent 执行
- [x] 各 agent 角色可正确执行各自职责
- [x] Evidence Pipeline 可正确追踪命令和测试
- [x] Memory Governance 可正确管理事实置信度和晋升
- [x] Model Gateway 可正确路由模型请求

## Phase 5: 证据化交付
- [x] Intent Diff 可按意图分类展示代码改动
- [x] Review Packet 可正确聚合所有审查证据
- [x] 未验证项可正确识别
- [x] Reviewer Focus 可正确生成
- [x] PR 建议可正确生成
- [x] Brain 更新建议可正确生成
- [x] Safe Apply Checklist 可正确检查所有项目

## Phase 6: Developer Runtime
- [x] Terminal 可正常交互
- [x] Git 状态可正确查询
- [x] Worktree 可正常管理
- [x] 测试可正常执行和结果解析

## Phase 7: 安全与审计
- [x] 敏感文件访问可正确拦截
- [x] 高风险路径操作可正确要求确认
- [x] 命令分级可正确执行
- [x] 审计日志可正确记录所有 agent 行为

## Phase 8: 端到端工作流
- [x] 打开项目 → Project Brain 初始化流程完整
- [x] 创建任务 → Task Capsule 编译流程完整
- [x] 执行任务 → Agent Runtime 调度流程完整
- [x] 完成交付 → Review Packet 生成与 Safe Apply 流程完整
