# sAgent 项目进度跟踪

---

## 📋 修改过的文件

### 新增文件
| 文件 | 说明 |
|------|------|
| `apps/api/src/common/response.interceptor.ts` | 全局统一响应拦截器 |
| `apps/api/src/common/exception.filter.ts` | 全局异常过滤器 + 错误码体系 |
| `apps/api/src/common/websocket.gateway.ts` | WebSocket 网关（Socket.IO + JWT 认证） |
| `apps/api/src/modules/agent/acp/acp-protocol.ts` | ACP/1.0 Agent 通信协议 |
| `apps/api/src/modules/agent/acp/agent-orchestrator.ts` | Agent 编排器（4 种协作模式 + 冲突解决） |
| `apps/api/src/modules/agent/agents/code-review.agent.ts` | Code Review Agent |
| `apps/api/src/modules/agent/agents/interview.agent.ts` | Interview Agent |
| `apps/api/src/modules/agent/agents/knowledge-graph.agent.ts` | Knowledge Graph Agent |
| `apps/api/src/modules/agent/agents/mentor.agent.ts` | Mentor Agent |
| `apps/api/src/modules/agent/agents/path-planner.agent.ts` | Path Planner Agent（BKT+RL） |
| `apps/api/src/modules/agent/evolution/ab-test.service.ts` | A/B 测试引擎（灰度发布 + t 检验） |
| `apps/api/src/modules/agent/evolution/bkt-rl-algorithm.ts` | BKT 贝叶斯知识追踪 + RL Q-Learning |
| `apps/api/src/modules/agent/evolution/evolution-engine.service.ts` | 进化引擎编排管线 |
| `apps/api/src/modules/agent/vibe/vibe-coding.service.ts` | 氛围编程 5 种交互模式 |
| `apps/api/src/modules/agent/vibe/feedback.service.ts` | 8 种实时反馈机制 |
| `apps/api/src/modules/exercise/exercise-state-machine.ts` | 练习提交状态机 |
| `apps/api/src/modules/knowledge-point/content-management.service.ts` | 内容管理系统 |
| `apps/api/src/modules/learning-path/path-state-machine.ts` | 学习路径状态机 |
| `packages/shared/src/error-codes.ts` | 错误码常量（已合并到 api.ts） |
| `packages/shared/src/response.ts` | 响应工具函数（已合并到 api.ts） |

### 修改文件
| 文件 | 变更内容 |
|------|----------|
| `apps/web/src/app/dashboard/vibe/page.tsx` | 修复 API 返回值格式兼容 + 显式传递 accessToken 解决 401 |

---

## ✅ 上一条真正跑通的命令

```
pnpm --filter @sagent/api build
```
通过时间：2026-06-13 21:35（所有 8 个 Phase 构建通过）

```
node dist\main  → API 运行在 :3001
pnpm dev        → Web 运行在 :3000
```

---

## 🚧 当前卡住的问题

1. **~~`/dashboard` 页面客户端 hydration 失败~~** ✅ 已修复（改用 `window.location.href` + 移除 `usePathname`）
2. **~~`/dashboard/vibe` 页面 `lastMsg.content.match()` 报错~~** ✅ 已修复（加空值检查）
3. **~~`/dashboard/vibe` 点击模板后无响应~~** ✅ 已修复（API 返回值格式兼容 `res.data || res`）
4. `AiChatPanel.tsx` 组件缺失 — 被 dashboard/page.tsx 动态导入但文件不存在
5. 所有前端 API 调用可能需要兼容统一响应格式

---

## 🎯 下一步计划

1. ~~创建缺失的 `AiChatPanel.tsx` 组件~~ → 已内嵌到 vibe 页面 Chat 模式
2. ~~全局修复 API 调用格式兼容~~ → 已完成统一响应格式处理
3. ~~验证 vibe 页面完整流程~~ ✅ API 测试通过，前后端均返回 200

### 重构的"氛围编程"学习系统已上线

**API 端点：** `POST /api/v1/vibe-learning/session` 等 7 个端点
**知识体系：** 72 个知识点覆盖 8 大模块
**前端页面：** `http://localhost:4000/dashboard/vibe`

### 2026-06-14 更新
- ✅ 编码练习通过线改为 **90%**，未通过时显示**参考答案对比分析**
- ✅ 通过后显示**完成过渡页**：显示已掌握/下一个知识点/还需 N 个
- ✅ 学习页面顶部**持久进度条**：已完成/总数/还需 N 个/每模块圆点
- ✅ 进度标签页显示**"N 未学"**标签
- ✅ **不再删除用户数据库**：重启服务保留用户数据

### 2026-06-16 更新 — 氛围学习重新设计实施方案

**按 `/doc/氛围学习重新设计方案.md` 分步骤实施：**

- ✅ **步骤1: phase-config.ts 对齐设计方案**
  - `LearningLoopStep` 类型从 `'concept' | 'practice' | 'assess'` 改为 `'concept' | 'code' | 'quiz'`，与 page.tsx `LearningMode` 统一
  - `LOOP_STEPS` 增加 `icon` 字段，key/label/emoji 对齐设计方案
  - 新增 `PASS_THRESHOLD = 0.9` 闭环决策常量
  - 新增 `isPassed()` 评估判断函数
  - 新增 `getPhaseProgress()` 阶段进度计算函数
  - page.tsx 中 `'reading'` → `'concept'`、`'coding'` → `'code'` 全量替换（8处）
- ✅ **步骤2: VibeSidebar.tsx 对齐设计方案§6.3/§3.3**
  - 重写侧边栏，对齐三步闭环导航
  - 传入 `currentLoopStep` prop 高亮当前步骤
- ✅ **步骤3: ConceptPanel.tsx 概念卡片升级**
  - 概念卡片增加视觉层级/序号
  - 代码示例增加语法高亮
  - 更好的折叠/展开交互
- ✅ **步骤4: VibeCodeLab.tsx 编码实验室升级**
  - 闭环步骤指示器（LOOP_STEPS 高亮 code 步骤）
  - 评分环 SVG（§7.4.3 精确实现，颜色随分数变化）
  - 通过后「进入评估测验」按钮（闭环前进）
  - 未通过时「回到概念理解」按钮（闭环回退）
- ✅ **步骤5: VibeQuizPanel.tsx 知识检验升级**
  - 闭环步骤指示器（LOOP_STEPS 高亮 quiz 步骤）
  - 评分环 SVG
  - 未通过时「回到概念理解」「回到动手实践」按钮（闭环回退）
  - 答题结果回顾模式（正确/错误标注）
- ✅ **步骤6: page.tsx 闭环决策 props 传递**
  - VibeCodeLab 传入 `onBackToConcept` / `onStartQuiz`
  - VibeQuizPanel 传入 `onBackToConcept` / `onBackToPractice`
  - TypeScript 构建通过 ✅
- ✅ **步骤7: 完成过渡 + 动画系统**
  - 后端 `vibe-learning.service.ts` — `getProgress` 返回 `completedNodeIds` 字段
  - 前端 `page.tsx` — `completedNodes` 改用 `completedNodeIds` + `knowledgeState` 构建 Set，修复原来 `recentActivity.nodeName` 错误
  - 完成过渡卡片增强：脉冲动画 `animate-ping-slow`、shimmer 光条、渐变背景、进度显示
  - `globals.css` 新增 4 种动画：`animate-shimmer`、`animate-ping-slow`、`animate-pulse-dot`、`animate-unlock-glow`
  - `VibeSidebar.tsx` — `justCompleted`/`justUnlocked` 检测 + 节点渲染动画：
    - 刚完成节点：emerald glow + scale-in 图标 + ✓ 标记
    - 刚解锁节点：orange glow + ping-slow 闪光 + 🔓 标记
    - 当前学习节点：pulse-dot 脉冲呼吸
  - `pnpm --filter web build` 构建通过 ✅
- ✅ **步骤8: VibeProgressDashboard 进度仪表盘升级**
 - 对齐§4.1五阶段色彩体系：蓝(P1)→紫(P2)→橙(P3)→绿(P4)→金(P5)
 - `PHASE_COLORS` 常量映射：每阶段独立 `barFrom`/`barTo`/`dotCompleted`/`dotLearning` 色彩
 - 总体进度条改为**分段渐变**：每个阶段一段，颜色对应阶段
 - 阶段进度条使用 `linear-gradient(from, to)` 对齐§4.1
 - 知识点圆点使用阶段色彩替代原来的统一 `bg-green-400`
 - 掌握度柱状图改用渐变色（`from/to` style 而非 Tailwind class）
 - 进度环 SVG 渐变改为五段色（蓝→紫→橙→绿→金）
 - 最近活动列表中知识点名称使用所属阶段 `accent` 色彩
 - 移除未使用的 `moduleProgress`/`ArrowRight`/`RotateCcw` 导入
 - `pnpm --filter web build` 构建通过 ✅
