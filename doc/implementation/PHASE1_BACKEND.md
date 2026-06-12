# Phase 1 — 后端任务清单

> 语言: Python 3.12 + FastAPI + uv
> 状态: ✅ 全部完成 (2026-06-12)
> LLM: MiMo (小米) — token-plan-cn.xiaomimimo.com
> 数据库: 19 张表已建成
> 路由: 42 个 API 端点

---

## 完成状态

| Week | 模块 | 状态 |
|------|------|------|
| 1 | 骨架 + 数据库 + 认证 + 配置/配额 | ✅ |
| 2 | LLM 服务 + Agent 状态机 + 子智能体 + 面试 API + SSE | ✅ |
| 3 | Embedding + FAISS 检索 + 题库 100 题 + 工作记忆 | ✅ |
| 4 | 反馈 + 联调修复 + 部署配置 | ✅ |
| 扩展 | 支付 + 语音 + 邀请 + 通知 + 优惠券 + 成就 + 微信登录 | ✅ |

---

## Week 1: 骨架 + 数据库 + 用户系统

### B1.1 — 项目骨架
- [ ] FastAPI 项目初始化 (main.py, config.py)
- [ ] requirements.txt (fastapi, uvicorn, sqlalchemy, asyncmy, redis, openai, pydantic)
- [ ] Dockerfile (python:3.11-slim)
- [ ] docker-compose.yml (backend + mysql + redis)
- [ ] docker-compose.dev.yml (热重载 + 端口暴露)
- [ ] .env.example
- [ ] GET /health 端点

**验证**: `docker compose up` → `curl localhost:8000/health` 返回 `{"status":"ok"}`

### B1.2 — 数据库 + ORM
- [ ] db/mysql.py — async engine + session factory (pool_size=10)
- [ ] db/redis.py — aioredis 连接封装
- [ ] models/user.py — User 模型
- [ ] models/interview.py — InterviewSession, InterviewRound
- [ ] models/knowledge.py — KnowledgeQuestion
- [ ] models/config.py — Industry, Position, InterviewMode, DifficultyConfig
- [ ] Alembic 初始化 + 首个迁移
- [ ] db/seed.py — 种子数据脚本 (10 行业, 每行业 5-8 岗位, 5 模式, 5 难度)

**验证**: `alembic upgrade head` + `python -m db.seed` 无报错，数据可查

### B1.3 — 认证
- [ ] utils/jwt.py — 签发 (HS256, 7天) / 验证 / 自动续签 (X-New-Token header)
- [ ] api/deps.py — get_current_user 依赖
- [ ] api/auth.py:
  - POST /api/auth/wechat (code → 微信 API 换 openid → 查/建用户 → 签 JWT)
  - GET /api/auth/me
  - PUT /api/auth/profile
- [ ] 开发模式 mock: 跳过微信验证，用 test_openid 直接登录

**验证**: `curl -X POST /api/auth/wechat -d '{"code":"test"}'` → 拿到 token → `/me` 正常

### B1.4 — 配置接口 + 配额
- [ ] api/config.py:
  - GET /api/config/industries
  - GET /api/config/positions?industry_id=x
  - GET /api/config/modes?category=x
  - GET /api/config/difficulties
- [ ] api/quota.py:
  - GET /api/quota/status
- [ ] Redis 配额初始化逻辑 (首次请求时从 MySQL 加载写入 Redis)
- [ ] 限流中间件 (Redis INCR + EXPIRE, 30 req/min)

**验证**: 所有配置接口返回种子数据，quota 返回正确剩余次数

---

## Week 2: Agent 核心 + 面试 API

### B2.1 — LLM 服务
- [ ] services/llm.py:
  - DeepSeek API 封装 (openai SDK 兼容模式)
  - stream_chat(messages, params) → AsyncGenerator[str]
  - chat(messages, params) → str
  - chat_json(messages, params) → dict (强制 JSON 输出)
  - 超时 30s + 重试 1 次 (2s 退避)
  - token 计数记录

**验证**: 单元测试调通 DeepSeek，stream 能逐字返回

### B2.2 — Agent 状态机
- [ ] agent/core.py:
  - InterviewAgent 类
  - 状态枚举: IDLE/PLANNING/QUESTIONING/EVALUATING/DECIDING/PROBING/REPORTING/DONE
  - run() 主循环 — 驱动状态流转
  - Redis session hash 读写
  - 结束条件: 题数达标 / 用户主动 / 超时 45min
- [ ] Redis Lua 脚本: 原子扣配额 + 设 active_session
- [ ] agent/context.py — Agent 上下文管理 (读写 agent_ctx)

**验证**: 模拟输入跑完整循环，状态正确流转到 DONE

### B2.3 — 子智能体
- [ ] agent/prompts/planner.txt — 规划器 Prompt
- [ ] agent/prompts/prober.txt — 追问器 Prompt
- [ ] agent/prompts/evaluator.txt — 评估器 Prompt
- [ ] agent/prompts/reporter.txt — 报告器 Prompt
- [ ] agent/planner.py — plan(jd, position, difficulty, user_profile) → 面试大纲 JSON
- [ ] agent/prober.py — probe(question, answer, score) → 追问题 | None
- [ ] agent/evaluator.py — evaluate(question, answer, criteria) → 评分 JSON
- [ ] agent/reporter.py — report(rounds, user_profile) → 报告 JSON

**验证**: 每个子智能体独立测试，输出符合定义的 JSON Schema

### B2.4 — 面试 API
- [ ] api/interview.py:
  - POST /api/interview/start
  - POST /api/interview/{uuid}/answer
  - POST /api/interview/{uuid}/skip
  - POST /api/interview/{uuid}/end
  - GET /api/interview/{uuid}/report
  - GET /api/interview/history (分页)
  - GET /api/interview/active
- [ ] api/interview_stream.py:
  - GET /api/interview/{uuid}/stream (SSE)
  - 事件推送: connected/status/question/thinking/evaluation/report/error/done
  - 每条事件带自增 id
  - sse_log 写入 Redis List
  - Last-Event-ID 重连恢复
  - 15s 心跳 :ping
  - 5min/15min 超时处理

**验证**: `curl` 完成一次完整面试: start → 连 SSE → answer x3 → end → 拿到 report

---

## Week 3: 知识库 + 记忆

### B3.1 — Embedding
- [ ] knowledge/embedder.py:
  - embed(text) → list[float] (1024d)
  - embed_batch(texts) → list[list[float]]
  - 选择: 调用 embedding API 或本地 sentence-transformers (bge-m3-small)

**验证**: 输入中文文本返回 1024d 向量

### B3.2 — FAISS 向量检索
- [ ] knowledge/retriever.py:
  - FAISSRetriever 类
  - build_index(questions: list) — 从 MySQL 加载构建
  - search(query_text, top_k, filters) → list[QuestionResult]
  - 标量过滤: industry_id, position_id, difficulty, 排除 asked set
  - save() / load() — 索引持久化到 backend/data/faiss/
- [ ] scripts/build_index.py — 构建索引脚本

**验证**: `python scripts/build_index.py` 成功，search("微服务") 返回相关题

### B3.3 — 题库种子数据
- [ ] data/seed_questions.json — 100 道种子题:
  - 互联网-后端: tech 20 + behavior 10 + scenario 5 + stress 5
  - 互联网-产品: behavior 15 + scenario 15 + tech 5 + stress 5
  - 互联网-前端: tech 20
  - 每题含: question, reference_answer, scoring_criteria, tags, difficulty
- [ ] scripts/import_questions.py — 导入 MySQL + 构建 FAISS

**验证**: 100 题入库，FAISS 可检索

### B3.4 — 工作记忆
- [ ] memory/working.py:
  - save_round(session_id, round_data) — 写 agent_ctx + asked set
  - get_context(session_id) → 最近 3 轮 + 评估摘要
  - is_asked(session_id, question_id) → bool
- [ ] Agent 循环集成记忆读写

**验证**: 面试中不重复出题，追问引用之前回答内容

### B3.5 — Agent 集成知识库
- [ ] Planner 出题调用 retriever.search()
- [ ] 过滤 + 去重 + 降级逻辑
- [ ] question_source 字段写入 interview_rounds

**验证**: Agent 优先用题库出题，题库无匹配时自行生成

---

## Week 4: 联调 + 修复 + 部署

### B4.1 — 反馈接口 (Phase 1 最小集)
- [ ] POST /api/feedback — 提交反馈

### B4.2 — 联调修复
- [ ] 前端联调中发现的接口 bug 修复
- [ ] SSE 流式稳定性 (断线恢复, 超时, 并发)
- [ ] Agent 输出质量调优 (Prompt 迭代)
- [ ] 异常边界处理 (空回答, 超长文本, 非法请求)

### B4.3 — 部署
- [ ] 生产 Dockerfile 优化 (multi-stage build)
- [ ] Alembic 生产迁移流程验证
- [ ] 日志格式化 (structlog JSON)
- [ ] /health 端点含 MySQL/Redis 检查

**验证**: 生产环境后端稳定运行，日志可查，接口全部可用
