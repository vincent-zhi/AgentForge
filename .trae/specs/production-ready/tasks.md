# Tasks

## Phase D: 端到端工作流 — 让核心流程真正跑通

- [x] Task D1: 实现端到端工作流控制器
  - [x] SubTask D1.1: 创建 workflow-controller.ts — 串联完整流程
  - [x] SubTask D1.2: 实现任务状态机（draft → planning → executing → reviewing → completed/failed/cancelled）
  - [x] SubTask D1.3: 每个状态转换触发 IPC 事件推送，更新渲染进程 store
  - [x] SubTask D1.4: 在 Goal Bar 提交时调用 workflowController.start(goal)
  - [x] SubTask D1.5: 实现 Plan 确认对话框
  - [x] SubTask D1.6: 用户确认后触发 Agent 执行
  - [x] SubTask D1.7: 任务完成后自动生成 Review Packet

- [x] Task D2: 增强 Project Brain 扫描器
  - [x] SubTask D2.1: 增强 scanner.ts — 支持 TypeScript monorepo 深度扫描
  - [x] SubTask D2.2: 增强 dependency-graph.ts — 支持 dynamic import、re-export、barrel files
  - [x] SubTask D2.3: 增强 api-extractor.ts — 解析 TypeScript 类型定义
  - [x] SubTask D2.4: 增强 test-mapper.ts — 支持 jest、vitest、mocha 配置检测
  - [x] SubTask D2.5: 实现 brain-service 增量更新
  - [x] SubTask D2.6: 扫描结果持久化到 SQLite

- [x] Task D3: Brain Navigator 文件浏览器
  - [x] SubTask D3.1: 创建 file-explorer.tsx
  - [x] SubTask D3.2: 使用 TreeView 组件展示文件/目录结构
  - [x] SubTask D3.3: 文件图标根据扩展名区分
  - [x] SubTask D3.4: 点击文件 → 在 Monaco Editor 中打开
  - [x] SubTask D3.5: 右键上下文菜单
  - [x] SubTask D3.6: 在 Brain Navigator 中添加 Files 标签页

- [x] Task D4: Agent 真实 LLM 调用流
  - [x] SubTask D4.1: 增强 model-gateway.ts — 实现真实 OpenAI API 调用
  - [x] SubTask D4.2: 增强 model-gateway.ts — 实现真实 Anthropic API 调用
  - [x] SubTask D4.3: 实现 prompt 模板系统
  - [x] SubTask D4.4: 增强 architect-agent.ts — 使用 LLM 生成 Spec
  - [x] SubTask D4.5: 增强 impact-agent.ts — 使用 LLM + 静态分析混合
  - [x] SubTask D4.6: 增强 coder-agent.ts — 使用 LLM 生成代码修改
  - [x] SubTask D4.7: 增强 reviewer-agent.ts — 使用 LLM 审查 diff
  - [x] SubTask D4.8: 实现 agent 执行超时和重试机制

- [x] Task D5: Worktree 自动隔离
  - [x] SubTask D5.1: 创建 worktree-manager.ts
  - [x] SubTask D5.2: 任务执行前自动创建 worktree
  - [x] SubTask D5.3: Agent 在 worktree 中执行代码修改
  - [x] SubTask D5.4: 任务完成后提供 Merge / Discard 选项
  - [x] SubTask D5.5: Merge 操作将 worktree 改动合并回主分支
  - [x] SubTask D5.6: Discard 操作删除 worktree

## Phase E: 编辑器增强 — 让代码编辑真正可用

- [x] Task E1: LSP Bridge
  - [x] SubTask E1.1: 创建 lsp-bridge.ts — TypeScript Language Service 集成
  - [x] SubTask E1.2: 实现代码补全
  - [x] SubTask E1.3: 实现类型检查 — 获取诊断信息
  - [x] SubTask E1.4: 实现跳转定义
  - [x] SubTask E1.5: 实现查找引用
  - [x] SubTask E1.6: 实现悬停信息
  - [x] SubTask E1.7: 添加 IPC channels
  - [x] SubTask E1.8: 在 Monaco Editor 中集成 LSP 功能

- [x] Task E2: Inline Agent Suggestions
  - [x] SubTask E2.1: 创建 inline-suggestion.tsx
  - [x] SubTask E2.2: Ctrl+I 触发 AI 建议
  - [x] SubTask E2.3: 建议以灰色内联文本形式展示
  - [x] SubTask E2.4: Tab 接受建议，Esc 拒绝
  - [x] SubTask E2.5: 建议内容通过 Model Gateway 生成

- [x] Task E3: 全局搜索和替换
  - [x] SubTask E3.1: 创建 search-panel.tsx
  - [x] SubTask E3.2: 搜索输入框 + 正则开关 + 大小写敏感开关 + 文件过滤
  - [x] SubTask E3.3: 搜索结果列表
  - [x] SubTask E3.4: 点击结果跳转到文件对应行
  - [x] SubTask E3.5: 替换功能
  - [x] SubTask E3.6: Ctrl+Shift+F 打开搜索面板
  - [x] SubTask E3.7: 搜索通过 IPC 调用 grep

- [x] Task E4: Agent 执行进度可视化
  - [x] SubTask E4.1: 创建 execution-progress.tsx
  - [x] SubTask E4.2: 展示执行步骤列表
  - [x] SubTask E4.3: 当前步骤高亮，已完成步骤绿色勾选
  - [x] SubTask E4.4: 每个步骤显示耗时
  - [x] SubTask E4.5: 在 Task Workspace 中集成进度指示器

## Phase F: 开发者工具 — 让工程能力完整

- [x] Task F1: Package Manager Adapter
  - [x] SubTask F1.1: 创建 package-manager.ts
  - [x] SubTask F1.2: 检测 pnpm-lock.yaml / yarn.lock / package-lock.json
  - [x] SubTask F1.3: 实现 install 命令
  - [x] SubTask F1.4: 实现 run-script 命令
  - [x] SubTask F1.5: 在 Evidence Console 底部状态栏显示包管理器类型

- [x] Task F2: CI 状态检测
  - [x] SubTask F2.1: 创建 ci-detector.ts
  - [x] SubTask F2.2: 检测 .github/workflows/、.gitlab-ci.yml、Jenkinsfile、.circleci/
  - [x] SubTask F2.3: 解析 GitHub Actions workflow 名称和触发条件
  - [x] SubTask F2.4: 在 Evidence Console 添加 CI 标签页
  - [x] SubTask F2.5: 展示 CI workflow 列表和状态

- [x] Task F3: 决策记录（ADR）管理
  - [x] SubTask F3.1: 创建 adr-manager.ts
  - [x] SubTask F3.2: ADR 数据对象定义
  - [x] SubTask F3.3: 在 Brain Navigator Decisions 标签页添加"New Decision"按钮
  - [x] SubTask F3.4: ADR 编辑表单（模态对话框）
  - [x] SubTask F3.5: ADR 持久化到 SQLite

- [x] Task F4: 团队规则和项目约束管理
  - [x] SubTask F4.1: 创建 policy-manager.ts
  - [x] SubTask F4.2: 策略数据对象定义
  - [x] SubTask F4.3: 在 Settings 面板添加"团队规则"标签页
  - [x] SubTask F4.4: Impact Guard 和 Context Lease 读取策略配置
  - [x] SubTask F4.5: 策略持久化到 settings

- [x] Task F5: 拖放文件打开
  - [x] SubTask F5.1: 在 Monaco Editor 区域添加拖放处理
  - [x] SubTask F5.2: 从 Brain Navigator 拖文件到编辑器 → 打开文件
  - [x] SubTask F5.3: 从系统文件管理器拖文件到编辑器 → 打开文件

# Task Dependencies
- Task D2 depends on Task D1
- Task D3 depends on Task D1
- Task D4 depends on Task D1
- Task D5 depends on Task D1, Task D4
- Task E1 depends on Task D1
- Task E2 depends on Task E1, Task D4
- Task E3 depends on Task D1
- Task E4 depends on Task D1, Task D4
- Task F1 depends on Task D1
- Task F2 depends on Task D1
- Task F3 depends on Task D1
- Task F4 depends on Task D1
- Task F5 depends on Task D3
