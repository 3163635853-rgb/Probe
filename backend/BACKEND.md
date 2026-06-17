# 后端 API 总览

> 最后更新: 2026-06-12
> 框架: Python 3.12 + FastAPI + uv
> LLM: MiMo (小米) — token-plan-cn.xiaomimimo.com
> 数据库: MySQL 8.0 (19 表) + Redis 7
> 路由: 44 个端点

---

## 启动

```bash
cd backend
# 1. 基础设施
docker compose -f ../docker-compose.dev.yml up -d mysql redis

# 2. 迁移 + 种子
uv run alembic upgrade head
uv run python -m db.seed

# 3. 运行
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

环境变量见 `.env`（从 `.env.example` 复制）。

---

## 认证方式

- 业务接口: `Authorization: Bearer <JWT>`
- SSE 流: `?ticket=<one-time-ticket>` (优先) 或 `?token=<JWT>` (兼容)
- Token 有效期 7 天，到期前 24h 自动续签 (响应头 `X-New-Token`)

---

## 全部接口 (44)

### 认证 `/api/auth`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /auth/register | 邮箱注册 | 否 |
| POST | /auth/login | 邮箱登录 | 否 |
| POST | /auth/wechat | 微信登录 | 否 |
| POST | /auth/ticket | 换取 SSE 一次性 ticket (30s) | 是 |
| GET | /auth/me | 当前用户信息 + 配额 | 是 |
| PUT | /auth/profile | 更新昵称/头像 | 是 |

### 配置 `/api/config`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /config/industries | 行业列表 | 否 |
| GET | /config/positions?industry_id= | 岗位列表 | 否 |
| GET | /config/modes?category= | 面试模式 | 否 |
| GET | /config/difficulties | 难度列表 | 否 |

### 面试 `/api/interview`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /interview/start | 开始面试 (扣配额) | 是 |
| GET | /interview/{uuid}/stream | SSE 面试流 | ticket/token |
| POST | /interview/{uuid}/answer | 提交回答 | 是 |
| POST | /interview/{uuid}/skip | 跳过当前题 | 是 |
| POST | /interview/{uuid}/end | 主动结束 | 是 |
| GET | /interview/{uuid}/report | 获取报告 | 是 |
| GET | /interview/history?page=&page_size= | 历史记录 | 是 |
| GET | /interview/active | 当前进行中面试 | 是 |
| GET | /interview/stats?limit= | 分数趋势 | 是 |

### 配额 `/api/quota`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /quota/status | 配额状态 (含 unlimited 字段) | 是 |

### 支付 `/api/payment`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /payment/plans | 定价方案 | 否 |
| POST | /payment/create | 创建订单 | 是 |
| POST | /payment/webhook | 支付回调 (验签) | 否 |
| GET | /payment/orders?page= | 支付记录 | 是 |

### 订阅 `/api/subscription`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /subscription/current | 当前订阅 | 是 |
| PUT | /subscription/auto-renew | 开关自动续费 | 是 |

### 邀请 `/api/invite`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /invite/my-code | 获取邀请码 | 是 |
| POST | /invite/redeem | 兑换邀请码 | 是 |
| GET | /invite/records | 邀请记录 | 是 |

### 通知 `/api/notification`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /notification/list?page=&unread_only= | 通知列表 | 是 |
| GET | /notification/unread-count | 未读数 | 是 |
| PUT | /notification/{id}/read | 标记已读 | 是 |
| PUT | /notification/read-all | 全部已读 | 是 |

### 优惠券 `/api/coupon`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /coupon/mine?status= | 我的优惠券 | 是 |
| POST | /coupon/redeem | 兑换券码 | 是 |

### 成就 `/api/achievement`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /achievement/list | 成就列表 | 是 |

### 语音 `/api/speech`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /speech/transcribe | 语音转文字 (Whisper) | 是 |
| GET | /speech/tts?text=&voice= | 文字转语音 (Edge TTS) | 是 |

### 文件 `/api/file`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /file/upload?type= | 上传文件 | 是 |
| GET | /file/{uuid} | 获取文件 | 是 |

### 分享 `/api/share`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /share/generate-image | 生成分享图 | 是 |
| POST | /share/record | 记录分享行为 | 是 |
| GET | /share/callback/{id} | 分享点击回调 | 否 |

### 反馈 `/api/feedback`

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| POST | /feedback | 提交反馈 | 是 |

### 健康检查

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| GET | /health | MySQL + Redis 状态 | 否 |

---

## 通用响应格式

```json
// 成功
{"code": 0, "data": {...}}

// 分页
{"code": 0, "data": {"items": [...], "total": 100, "page": 1, "page_size": 20, "has_more": true}}

// 错误
{"code": 40201, "message": "配额不足", "detail": "..."}
```

### 错误码

| 范围 | 类别 |
|------|------|
| 40001-40099 | 认证/权限 |
| 40101-40199 | 参数校验 |
| 40201-40299 | 业务逻辑 |
| 40301-40399 | 支付 |
| 42900 | 限流 |
| 50001-50099 | 服务端 |

---

## SSE 事件格式

```
id: 1
event: question
data: {"round":1,"content":"...","type":"initial","dimension":"专业知识"}
```

事件类型: `connected` → `status` → `question` → `thinking` → `evaluation` → `question`(probe) → `report` → `done`

特殊: `error` / `reminder` / `:ping`(心跳)

---

## 数据库 (19 表)

**核心:** users, interview_sessions, interview_rounds, knowledge_questions

**配置:** industries, positions, interview_modes, difficulty_configs

**业务:** payments, subscriptions, feedbacks, notifications, achievements, user_achievements, coupons, user_coupons, invite_codes, invite_records

**系统:** alembic_version

---

## 限流

| 场景 | 限制 |
|------|------|
| 已登录用户 | 60 req/min |
| 未登录 IP | 30 req/min |
| SSE token query param | 否 |

---

## 关键设计决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 认证 | JWT HS256 + one-time ticket | SSE 不支持 header，ticket 防泄露 |
| 实时通信 | SSE | 单向推送为主，比 WebSocket 简单 |
| 配额 | Redis Lua 原子扣减 | 防超卖 |
| 向量检索 | FAISS 本地 | Phase 1 数据量小，零运维 |
| LLM | OpenAI SDK 兼容 | 可随时切换模型（DeepSeek/MiMo/GPT） |
| 限流 | Redis Lua INCR+EXPIRE | 原子操作，无竞态 |
| 密码 | bcrypt | 业界标准，72字节上限 |
| ORM | SQLAlchemy 2.0 async | 类型安全 + 异步 |
| 迁移 | Alembic | SQLAlchemy 配套 |
| 包管理 | uv | 快，lockfile 确定性 |
