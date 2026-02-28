# 明镜 MingJing — AI 职业表达教练

**明镜**帮助 3-8 年经验的职场人突破"能做不能说"的面试表达困境。通过 AI 驱动的三大机制——费曼检验、四层剖析、安全排练——将模糊的职业叙事转化为结构清晰、有说服力的面试表达。

---

## 快速启动

### 前置条件

- Node.js >= 18
- PostgreSQL >= 14
- pnpm >= 8

### 安装与运行

```bash
# 1. 进入项目目录
cd apps/mingjing

# 2. 安装依赖
pnpm install

# 3. 配置环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，填写 DATABASE_URL、JWT_SECRET、ANTHROPIC_API_KEY

# 4. 初始化数据库
cd backend && pnpm prisma migrate dev && cd ..

# 5. 启动开发服务（前后端并行）
pnpm dev
```

前端: `http://localhost:5173` | 后端 API: `http://localhost:3001/api/v1`

---

## 三大功能

### 1. 费曼面试检验

输入你的 STAR 故事（情境-任务-行动-结果），AI 从三个维度打分：

- **UDI（理解深度）** — STAR 四要素是否完整、因果链是否清晰
- **DDI（数据密度）** — 是否有量化成果和具体数据
- **CCI（因果清晰度）** — 行动与结果的归因是否明确

输出雷达图 + 逐维度反馈 + 改进建议。5 分钟内看到表达盲区。

### 2. 四层职业剖析

描述你的职业困惑，AI 逐层拆解：

- **事件层** — 客观发生了什么
- **情绪层** — 触发了什么情绪
- **需求层** — 背后是什么未被满足的需求
- **信念层** — 驱动反应的深层信念是什么

每层逐步展开，最后给出按优先级排序的行动建议。

### 3. 安全排练室

选择面试场景和面试官风格（行为面/技术面/压力面），与 AI 面试官进行 5-8 轮模拟对话。结束后获得四维反馈报告：

- 表达清晰度 (25%) + 内容深度 (30%) + 适应性 (25%) + 总体印象 (20%)

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite + TailwindCSS + shadcn/ui + Recharts |
| 后端 | Node.js + TypeScript + Fastify + Prisma |
| 数据库 | PostgreSQL |
| AI | Anthropic Claude API (SSE 流式输出) |
| 认证 | JWT (HS256) + bcrypt |
| 包管理 | pnpm workspace (monorepo) |

---

## 目录结构

```
apps/mingjing/
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/              # 页面：Home, Login, Register, Feynman, Layers, Rehearsal
│   │   ├── components/         # 组件：按功能域组织 (feynman/, layers/, rehearsal/, shared/, layout/)
│   │   ├── contexts/           # AuthContext (JWT + 用户状态)
│   │   ├── hooks/              # use-sse (SSE 流式 hook)
│   │   ├── lib/                # api-client, sse-client, utils
│   │   └── types/              # TypeScript 类型定义
│   └── vite.config.ts
│
├── backend/                    # Fastify API 服务
│   ├── prisma/schema.prisma    # 数据库模型 (User, Session, Feynman, Layers, Rehearsal)
│   ├── src/
│   │   ├── routes/             # API 路由 (auth, feynman, layers, rehearsal)
│   │   ├── services/           # 业务逻辑 + AI 调用
│   │   ├── prompts/            # AI 提示词模板 (6 个)
│   │   ├── plugins/            # Fastify 插件 (auth, cors, prisma, error-handler, rate-limit)
│   │   ├── middleware/         # JWT 认证中间件
│   │   └── utils/              # 统一响应格式 + SSE 工具
│   └── tests/e2e_flows.py      # E2E API 契约测试 (26/26 PASS)
│
└── pnpm-workspace.yaml         # monorepo 配置
```

---

## 环境变量

在 `backend/.env` 中配置：

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | `postgresql://user:pass@localhost:5432/mingjing` |
| `JWT_SECRET` | JWT 签名密钥（至少 32 字符） | `your-secret-key-min-32-chars` |
| `JWT_EXPIRES_IN` | Token 过期时间 | `7d` |
| `ANTHROPIC_API_KEY` | Claude API 密钥 | `sk-ant-...` |
| `CLAUDE_MODEL` | Claude 模型 | `claude-sonnet-4-6` |
| `PORT` | 后端端口 | `3001` |
| `CORS_ORIGIN` | 允许的前端域名 | `http://localhost:5173` |
| `REDIS_URL` | Redis 连接（可选，用于生产限速） | `redis://localhost:6379` |

---

## API 概览

所有 API 前缀 `/api/v1`，响应格式统一：

```json
// 成功
{ "success": true, "data": {} }

// 失败
{ "success": false, "error": { "code": "ERROR_CODE", "message": "..." } }

// 分页
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 10, "total": 50, "totalPages": 5 } }
```

| 模块 | 路径 | 核心端点 |
|------|------|----------|
| 认证 | `/auth` | POST `/register`, `/login`; GET `/me` |
| 费曼 | `/feynman` | POST `/session`, `/analyze` (SSE); GET `/history`, `/session/:id` |
| 四层 | `/layers` | POST `/session`, `/analyze` (SSE); GET `/history`, `/session/:id` |
| 排练 | `/rehearsal` | POST `/session`, `/message` (SSE), `/end/:id`; GET `/feedback/:id`, `/history` |
