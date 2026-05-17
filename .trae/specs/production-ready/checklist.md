# Checklist

## Phase D: 端到端工作流
- [x] Goal Bar 提交目标后触发完整工作流（解析→影响→胶囊→确认→执行→审查）
- [x] 任务状态机正确流转（draft→planning→executing→reviewing→completed/failed）
- [x] 每个状态转换触发 UI 更新
- [x] Plan 确认对话框展示 Task Capsule 摘要
- [x] 用户确认后 Agent 开始执行
- [x] 任务完成后自动生成 Review Packet
- [x] Project Brain 支持 TypeScript monorepo 深度扫描
- [x] 依赖图正确解析 import/export 语句
- [x] Brain Service 支持增量更新
- [x] 扫描结果持久化到 SQLite
- [x] Brain Navigator Files 标签页展示文件树
- [x] 点击文件可在 Monaco Editor 中打开
- [x] Agent 通过 Model Gateway 真实调用 LLM
- [x] Architect Agent 使用 LLM 生成 Spec
- [x] Coder Agent 使用 LLM 生成代码修改
- [x] 任务执行自动创建 Worktree 隔离
- [x] 任务完成后可 Merge 或 Discard Worktree

## Phase E: 编辑器增强
- [x] LSP Bridge 提供代码补全
- [x] LSP Bridge 提供类型检查诊断
- [x] LSP Bridge 提供跳转定义
- [x] LSP Bridge 提供查找引用
- [x] Monaco Editor 中集成 LSP 功能
- [x] Ctrl+I 触发 Inline AI 建议
- [x] AI 建议以灰色内联文本展示
- [x] Tab 接受建议，Esc 拒绝
- [x] 全局搜索面板可正常搜索
- [x] 搜索结果高亮展示匹配行
- [x] 替换功能正常工作
- [x] Ctrl+Shift+F 打开搜索面板
- [x] Agent 执行进度指示器正确展示步骤
- [x] 当前步骤高亮，已完成步骤勾选

## Phase F: 开发者工具
- [x] 正确检测包管理器类型
- [x] 包安装命令可正常执行
- [x] CI 配置可正确检测
- [x] CI workflow 列表可展示
- [x] ADR 可创建和查看
- [x] ADR 持久化到 SQLite
- [x] 团队规则可在 Settings 中配置
- [x] Impact Guard 读取策略配置
- [x] Context Lease 读取策略配置
- [x] 文件可从 Brain Navigator 拖放到编辑器
