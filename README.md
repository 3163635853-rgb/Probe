# Probe — AI 面试官智能体平台

> 一个会思考、有记忆、懂面试的 AI 面试官。

中文流式追问面试训练平台。Agent 自主规划面试流程、调度记忆系统、检索知识库，模拟真实面试官的思考过程。

## 定位

Final Round AI 的体验 × 中文市场 × 非技术岗 × 微信生态裂变

**三个无人区**：
1. 中文流式追命面试 — 追着回答漏洞往下挖
2. 非技术岗面试训练 — 产品/运营/市场/销售
3. 面试成绩单裂变 — 雷达图分享到朋友圈/小红书

## 技术栈

| 层 | 选型 |
|---|---|
| 后端 | Python 3.12 + FastAPI |
| 智能体 | 自研 Agent Loop (ReAct + 记忆) |
| LLM | MiMo (小米) — OpenAI 兼容接口 |
| 向量检索 | FAISS (Phase 1) → Milvus (Phase 2+) |
| 关系库 | MySQL 8.0 |
| 缓存 | Redis 7 |
| 前端 Web | Next.js 16 + Tailwind CSS |
| 前端 App | Expo (React Native) |
| 部署 | Docker Compose + Caddy |

## 项目结构

```
Probe/
├── backend/          # FastAPI 后端 + Agent 核心
│   ├── agent/        # 智能体 (planner/prober/evaluator/reporter)
│   ├── api/          # 路由 (12 模块, 47 端点)
│   ├── models/       # SQLAlchemy ORM
│   ├── services/     # LLM/语音/推送
│   ├── knowledge/    # FAISS 向量检索 + embedding
│   └── memory/       # Redis 工作记忆
├── web/              # Next.js 前端 (11 页面)
│   ├── app/          # 页面
│   ├── components/   # UI 组件
│   └── lib/          # API/SSE/Auth 封装
├── mobile/           # Expo React Native App (17 页面)
│   ├── app/          # expo-router 文件路由
│   ├── components/   # 原生 UI 组件
│   └── lib/          # API/SSE/Auth/Audio
├── doc/              # 架构文档
├── docker-compose.yml
└── docker-compose.dev.yml
```

## 本地开发

```bash
# 1. 克隆
git clone https://github.com/3163635853-rgb/Probe.git
cd Probe

# 2. 环境变量
cp .env.example .env
# 编辑 .env 填入 DEEPSEEK_API_KEY 等

# 3. 启动 (开发模式)
docker compose -f docker-compose.dev.yml up

# 4. 数据库迁移 + 种子数据
docker compose exec backend alembic upgrade head
docker compose exec backend python -m db.seed

# 5. 访问
# 后端: http://localhost:8000
# 前端: http://localhost:3000
```

## 文档

| 文档 | 内容 |
|------|------|
| [架构设计](doc/architecture/ARCHITECTURE.md) | 系统全景、Agent 状态机、技术决策 |
| [API 接口](doc/architecture/API.md) | 14 模块 40+ 端点完整规范 |
| [数据库](doc/architecture/DATABASE.md) | 20+ 表 + Redis + FAISS |
| [部署方案](doc/implementation/DEPLOY.md) | Docker + CI/CD + 监控 + 备份 |
| [竞品分析](doc/business/COMPETITIVE.md) | 市场定位 + 定价策略 |

## 版本规划

| Phase | 内容 | 周期 |
|-------|------|------|
| 1 | Web + 后端 + Agent 核心 | 4 周 |
| 2 | React Native App + 语音 | 3 周 |
| 3 | 微信小程序 + 支付 | 3 周 |
| 4 | 企业版 + 英文面试 | 持续 |

## License

Private — All rights reserved.
