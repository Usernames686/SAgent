# 🎓 sAgent：自我进化多智能体个性化学习氛围编程平台

> **赛道标签**：教育行业、AI Agent、氛围编程（Vibe Coding）
> **核心驱动**：本项目基于 Qwen3.6 模型（讯飞星火 MaaS），采用自我进化多智能体架构，实现个性化学习路径规划与实时编码评测。

<p align="center">
  <img src="doc/svg/banner.svg" alt="sAgent Banner" width="720"/>
</p>

---

## 📑 1. 产品文档摘要 (Product Overview)

**业务痛点**：传统编程学习平台存在三大核心问题：

1. **无个性化路径**：所有用户面对相同题目序列，无法根据个人能力水平动态调整，零基础学习者频繁受挫放弃，高级学习者浪费时间重复。
2. **AI 辅导能力弱**：现有平台的 AI 辅助仅限于答案提示，无法进行苏格拉底式引导、代码质量评估、调试教学等深度辅导。
3. **脱离实际编码体验**：视频课程 + 选择题的模式无法培养真实编程能力，缺少"写代码→运行→看结果→改进"的核心闭环。

**解决方案**：sAgent 通过三层创新解决上述痛点：

- **自我进化多智能体系统**：10 个专业化 Agent 协同工作，系统基于用户反馈数据持续优化策略。
- **氛围编程（Vibe Coding）范式**：以「说意图、定氛围、控结果」为核心，八大知识模块覆盖从认知思维到实战项目的完整学习链路。
- **个性化学习路径**：采用贝叶斯知识追踪（BKT）+ 强化学习（RL）混合算法，动态调整学习路径。

<p align="center">
  <img src="doc/svg/architecture-layers.svg" alt="系统分层架构" width="720"/>
</p>

---

## 💻 2. 项目源码结构说明 (Source Code)

本仓库采用 pnpm workspaces monorepo 架构，包含三个子包：

```
sagent/
├── apps/
│   ├── api/                       # @sagent/api — NestJS 10 后端
│   │   ├── src/
│   │   │   ├── main.ts            # 应用入口
│   │   │   ├── app.module.ts      # 根模块（聚合 20+ 业务模块）
│   │   │   ├── common/            # 全局拦截器、过滤器、守卫、WebSocket 网关
│   │   │   ├── database/          # TypeORM 数据库模块
│   │   │   ├── entities/          # TypeORM 实体（20+ 张表）
│   │   │   └── modules/
│   │   │       ├── agent/         # Agent 编排、预览渲染、自我进化
│   │   │       ├── ai-session/    # AI 会话管理
│   │   │       ├── auth/          # 认证授权（JWT + Passport）
│   │   │       ├── exercise/      # 练习题与提交
│   │   │       ├── knowledge-point/ # 知识点 + 知识图谱 + 懒 Seed
│   │   │       ├── learning-path/ # 学习路径规划
│   │   │       ├── sandbox/       # 代码执行沙箱（Docker + gVisor）
│   │   │       ├── vibe-learning/ # 氛围编程学习模块
│   │   │       └── ...           # badge/bookmark/community/health/history 等
│   │   └── package.json
│   └── web/                       # @sagent/web — Next.js 15 前端
│       ├── src/app/               # App Router（30+ 路由，含 dashboard 15+ 子页面）
│       ├── src/components/        # 组件（含 learn/、vibe/ 子目录）
│       ├── next.config.js         # Turbopack + Monaco 配置
│       └── package.json
├── packages/shared/               # @sagent/shared — 跨应用共享类型
├── doc/                           # 项目文档与 SVG 架构图
├── pnpm-workspace.yaml
├── start.bat                      # Windows 一键启动脚本
└── docker-compose.yml
```

**核心模块说明**：

| 模块 | 路径 | 职责 |
|------|------|------|
| Agent 编排 | `modules/agent/` | Orchestrator 意图识别、Agent 调度、上下文管理 |
| 知识图谱 | `modules/knowledge-point/` | 知识点 CRUD、前置依赖、懒 Seed |
| 学习路径 | `modules/learning-path/` | BKT + RL 路径规划、动态调整 |
| 代码沙箱 | `modules/sandbox/` | Docker + gVisor 安全隔离执行 |
| 氛围编程 | `modules/vibe-learning/` | 八大知识模块、Prompt 模板 |
| 自我进化 | `modules/agent/evolution/` | A/B 测试、策略优化、灰度发布 |

---

## 🚀 3. 部署与使用引导 (Deployment & Usage)

### 3.1 环境要求

| 依赖 | 版本要求 | 用途 |
|------|----------|------|
| Node.js | ≥ 20.x LTS | 前后端运行时 |
| pnpm | ≥ 9.0.0 | 包管理（monorepo workspace） |
| Docker | ≥ 24.x（可选） | 代码沙箱、容器化部署 |

### 3.2 安装

```bash
git clone <repo-url> sagent
cd sagent
pnpm install
cp apps/api/.env.example apps/api/.env
# 编辑 apps/api/.env 填入 LLM_API_KEY 等
```

### 3.3 启动

**Windows 一键启动**：

```bat
start.bat
```

**跨平台手动启动**：

```bash
pnpm dev
# 或分别启动
pnpm --filter @sagent/api dev    # API: http://localhost:4001/api/v1
pnpm --filter @sagent/web dev    # Web: http://localhost:4000
```

**Docker Compose 部署**：

```bash
docker-compose up -d
```

### 3.4 访问地址

| 服务 | 地址 |
|------|------|
| Web 前端 | http://localhost:4000 |
| API 后端 | http://localhost:4001/api/v1 |
| Swagger 文档 | http://localhost:4001/docs |

---

## 💡 4. 快速体验指令

```bash
# 安装依赖
pnpm install

# 配置环境变量（必填：LLM_API_KEY 讯飞星火 API Key）
cp apps/api/.env.example apps/api/.env

# 一键启动
pnpm dev

# 验证服务就绪
curl http://localhost:4001/api/v1/health
curl http://localhost:4000
```

<p align="center">
  <img src="doc/svg/startup-flow.svg" alt="启动流程" width="720"/>
</p>

---

## 🏢 5. 落地案例与价值说明书 (Business Case & Value Proposition)

### 5.1 行业业务痛点

1. **学习路径千人一面**：传统平台所有用户面对相同题目序列，零基础学习者频繁受挫放弃，高级学习者浪费时间重复。
2. **AI 辅导停留在表面**：仅限答案提示，无法进行苏格拉底式引导、代码质量评估、调试教学等深度辅导。
3. **缺乏真实编码闭环**：视频+选择题模式无法培养真实编程能力，"学会了概念但写不出代码"是普遍现象。
4. **氛围编程范式缺失**：AI 编程工具已改变编程方式，但学习平台仍在教"逐行手写代码"。

### 5.2 落地实施方案

1. **接入层**：Next.js 15（Turbopack）+ Monaco Editor + Socket.IO 实时通信。
2. **Agent 智能层**：

<p align="center">
  <img src="doc/svg/agent-layers.svg" alt="多智能体分层架构" width="720"/>
</p>

   - **Orchestrator（L1）**：意图识别、任务分解、Agent 调度、冲突解决。
   - **Tutor（L2）**：苏格拉底式引导、代码示范、解释层级适配。
   - **Evaluator（L2）**：正确性+风格+复杂度+安全四维评估。
   - **Debug（L2）**：错误定位、修复建议、调试教学。
   - **Path Planner（L2）**：BKT+RL 路径规划、动态调整。
   - **Evolution（L0）**：A/B 测试、策略优化、灰度发布。

3. **执行层**：Docker + gVisor 安全沙箱，支持多语言、内存限制、超时控制。
4. **数据层**：TypeORM + better-sqlite3（开发）/ PostgreSQL（生产），20+ 实体。
5. **业务闭环**：编码→评测→AI评估→路径调整→进化优化，形成完整学习反馈闭环。

### 5.3 场景复用能力

- **跨教育领域**：更换知识图谱和题库，可迁移至数学辅导、数据分析培训等。
- **跨行业扩展**：多Agent编排+代码评估+安全沙箱能力，可复用于企业代码审查自动化、技术面试评估平台。
- **氛围编程范式输出**：八大知识模块可独立输出，作为 AI 编程培训课程内容基础。

### 5.4 提效与降本量化收益

<p align="center">
  <img src="doc/svg/perf-comparison.svg" alt="启动耗时对比" width="720"/>
</p>

- **启动耗时缩短**：从 50-80s 降至 12-25s，提升 3-4 倍。
- **开发环境零外部依赖**：better-sqlite3 嵌入式数据库，无需安装 PostgreSQL/Redis/MongoDB。
- **全栈 TypeScript 统一**：前后端共享 `@sagent/shared` 类型包，减少接口对接成本。
- **Turbopack 增量编译**：比 webpack 快 10-700 倍。

---

## 🧬 6. 自我进化引擎 (Evolution Engine)

<p align="center">
  <img src="doc/svg/evolution-engine.svg" alt="自我进化引擎流程" width="720"/>
</p>

### 6.1 进化维度

| 进化维度 | 进化方法 | 周期 |
|----------|----------|------|
| Prompt 策略 | 变体 A/B 测试 + 自动选优 | 每周 |
| 路由策略 | 决策树参数优化 + 强化学习 | 每周 |
| 评估标准 | 与专家标注对比 + 参数调整 | 每月 |
| 路径算法 | 参数调优 + 多臂老虎机 | 每月 |
| 内容推荐 | 协同过滤 + 内容特征 + 偏好 | 每周 |
| 交互风格 | 风格变体测试 + 偏好学习 | 每月 |

### 6.2 进化安全约束

- **回滚机制**：一键回滚到上一稳定版本
- **灰度发布**：1% → 5% → 20% → 50% → 100% 渐进验证
- **效果下限**：进化后策略效果 ≥ 基线 95%
- **人工审核**：Prompt 核心逻辑变更需人工确认
- **审计日志**：全量记录

---

## 🎨 7. 氛围编程知识体系 (Vibe Coding Curriculum)

<p align="center">
  <img src="doc/svg/vibe-modules.svg" alt="八大知识模块" width="720"/>
</p>

| 模块 | 核心内容 | 难度 |
|------|----------|------|
| 一、认知与思维 | Vibe Coding 范式、氛围抽象、产品化思维、人机协作 | D1-D3 |
| 二、工具链 | AI IDE、Git、云平台部署、Prompt 模板库 | D1-D3 |
| 三、提示词工程 | Prompt 结构、氛围 Prompt、Few-shot、迭代闭环 | D2-D4 |
| 四、代码阅读与编程 | 前端/后端基础、代码评审、幻觉排查 | D1-D3 |
| 五、全栈工程能力 | 需求拆解、架构选型、API 开发、一键部署 | D2-D3 |
| 六、AI 大模型与高级 | LLM 原理、RAG、Agent 开发、多模态生成 | D3-D4 |
| 七、质量、安全与避坑 | 代码评审清单、幻觉识别、安全防范、TDD | D3-D4 |
| 八、实战项目 | 入门级/中级/高级项目 | D2-D4 |

---

## 🛠️ 8. 部署与使用手册 (Deployment Guide)

### 8.1 运行环境要求

| 依赖 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 20.x LTS | 前后端运行时 |
| pnpm | ≥ 9.0.0 | monorepo 包管理 |
| Docker | ≥ 24.x（可选） | 代码沙箱 |

### 8.2 分步安装与配置

```bash
# 克隆项目
git clone <repo-url> sagent
cd sagent

# 安装依赖
pnpm install

# 配置环境变量
cp apps/api/.env.example apps/api/.env
```

编辑 `apps/api/.env`，填入实际配置：

```ini
# 必填
LLM_API_KEY=your_xfyun_api_key

# 可选
PORT=4001
CORS_ORIGIN=http://localhost:4000
SANDBOX_MODE=auto
```

### 8.3 运行指令与操作步骤

**步骤一：启动开发服务器**

```bash
pnpm dev
```

**步骤二：验证 API 服务**

```bash
curl http://localhost:4001/api/v1/health
# 预期输出：{"code":0,"message":"success","data":{"status":"ok"}}
```

**步骤三：访问 Web 界面**

浏览器打开 http://localhost:4000，进入学习仪表盘。

**步骤四：结束运行**

`Ctrl + C` 终止进程，或关闭 start.bat 启动的两个 cmd 窗口。

### 8.4 环境变量完整清单

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `LLM_API_KEY` | ✅ | - | 讯飞星火 API Key |
| `LLM_BASE_URL` | - | `https://maas-api.cn-huabei-1.xf-yun.com/v2` | LLM API 地址 |
| `PORT` | - | `4001` | API 端口 |
| `CORS_ORIGIN` | - | `http://localhost:4000` | CORS 白名单 |
| `JWT_SECRET` | - | `sagent-dev-secret` | JWT 签名密钥 |
| `SANDBOX_MODE` | - | `auto` | 沙箱模式（auto/docker/process） |
| `SANDBOX_TIMEOUT_MS` | - | `10000` | 沙箱超时（毫秒） |

---

## 📄 附录

### A. 术语表

| 术语 | 定义 |
|------|------|
| Agent | 智能代理，具有特定角色和能力的 AI 实体 |
| BKT | 贝叶斯知识追踪，估算知识掌握概率 |
| RAG | 检索增强生成 |
| TTFT | 首字延迟（Time To First Token） |
| Vibe Coding | 氛围编程，「说意图、定氛围、控结果」的编程范式 |

### B. 浏览器兼容性

| 浏览器 | 支持版本 |
|--------|----------|
| Chrome | 最新 2 个主要版本 |
| Firefox | 最新 2 个主要版本 |
| Safari | 最新 2 个主要版本 |
| Edge | 最新 2 个主要版本 |

---

<p align="center">
  <strong>sAgent</strong> · 自我进化多智能体个性化学习氛围编程平台<br/>
  说意图 · 定氛围 · 控结果
</p>
