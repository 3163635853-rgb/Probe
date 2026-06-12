# API 接口设计

> Base URL: `https://api.probe.app/api`
> 认证: JWT Bearer Token (`Authorization: Bearer <token>`)
> 内容类型: `application/json`
> 最后更新: 2026-06-12 | 已实现 42 路由

---

## 通用规范

### 认证

```
POST /api/auth/wechat → 返回 JWT token
Token 有效期: 7天
Token 刷新: 到期前 24h 内请求自动续签（响应头 X-New-Token）
SSE 连接: token 作为 query param（EventSource 不支持自定义 header）
  GET /api/interview/{uuid}/stream?token=xxx
```

### 响应格式

**成功**:
```json
{
  "code": 0,
  "data": { ... },
  "message": "ok"
}
```

**分页**:
```json
{
  "code": 0,
  "data": {
    "items": [...],
    "total": 156,
    "page": 1,
    "page_size": 20,
    "has_more": true
  }
}
```

**错误**:
```json
{
  "code": 40001,
  "message": "配额不足，本月免费次数已用完",
  "detail": "upgrade to monthly plan for unlimited access"
}
```

### 错误码

| 范围 | 类别 | 示例 |
|------|------|------|
| 40001-40099 | 认证/权限 | 40001 token 过期, 40002 无权限, 40003 账号已封禁 |
| 40101-40199 | 参数校验 | 40101 缺少必填参数, 40102 参数格式错误 |
| 40201-40299 | 业务逻辑 | 40201 配额不足, 40202 已有进行中面试, 40203 优惠券已过期 |
| 40301-40399 | 支付 | 40301 订单不存在, 40302 支付失败 |
| 50001-50099 | 服务端 | 50001 LLM 超时, 50002 向量库不可用, 50003 内部错误 |

### 限流

| 场景 | 限制 | 超限返回 |
|------|------|---------|
| 全局 | 30 req/min/user | 429 + Retry-After header |
| 开始面试 | 1 req/min/user | 40202 已有进行中面试 |
| 支付 | 5 req/min/user | 429 |
| 未登录 | 10 req/min/IP | 429 |

### 分页参数

所有列表接口统一支持:
- `page` — 页码，从 1 开始，默认 1
- `page_size` — 每页条数，默认 20，最大 50

---

## 1. 认证模块 `/api/auth`

### POST /api/auth/wechat — 微信登录

```json
// Request
{ "code": "微信授权 code", "invite_code": "PROBE2026" }

// Response 200
{
  "code": 0,
  "data": {
    "token": "eyJhbGc...",
    "expires_at": "2026-06-12T10:00:00Z",
    "user": {
      "uuid": "xxx",
      "nickname": "用户名",
      "avatar": "https://...",
      "membership_type": "free",
      "membership_expire_at": null
    },
    "is_new_user": true
  }
}
```

### GET /api/auth/me — 当前用户信息

```json
// Response 200
{
  "code": 0,
  "data": {
    "uuid": "xxx",
    "nickname": "用户名",
    "avatar": "https://...",
    "phone": null,
    "membership_type": "free",
    "membership_expire_at": null,
    "quota_remaining": 2,
    "total_interviews": 5,
    "created_at": "2026-06-01T..."
  }
}
```

### PUT /api/auth/profile — 更新用户信息

```json
// Request
{ "nickname": "新昵称", "avatar": "https://..." }

// Response 200
{ "code": 0, "data": { "updated": true } }
```

---

## 2. 配置模块 `/api/config`

### GET /api/config/industries — 行业列表

```json
// Response 200
{
  "code": 0,
  "data": [
    { "id": 1, "name": "互联网", "icon": "💻", "description": "..." },
    { "id": 2, "name": "金融", "icon": "💰", "description": "..." }
  ]
}
```

### GET /api/config/positions?industry_id=1 — 岗位列表

```json
// Response 200
{
  "code": 0,
  "data": [
    { "id": 1, "name": "后端工程师", "category": "tech", "level": "mid", "default_difficulty": 3 },
    { "id": 2, "name": "产品经理", "category": "product", "level": "mid", "default_difficulty": 3 }
  ]
}
```

### GET /api/config/modes?category=tech — 面试模式

```json
// Response 200
{
  "code": 0,
  "data": [
    { "code": "tech", "name": "技术面", "description": "...", "default_rounds": 10, "default_duration_min": 30 },
    { "code": "mixed", "name": "综合面", "description": "...", "default_rounds": 10, "default_duration_min": 35 }
  ]
}
```

### GET /api/config/difficulties — 难度列表

```json
// Response 200
{
  "code": 0,
  "data": [
    { "level": 1, "name": "入门", "description": "适合应届生/转行新人" },
    { "level": 3, "name": "中级", "description": "适合 1-3 年经验" },
    { "level": 5, "name": "专家", "description": "适合 5 年+高级岗" }
  ]
}
```

---

## 3. 面试模块 `/api/interview`

### POST /api/interview/start — 开始面试

```json
// Request
{
  "industry_id": 1,
  "position_id": 3,
  "mode": "tech",
  "difficulty": 3,
  "jd_text": "负责系统架构设计..."    // 可选
}

// Response 200
{
  "code": 0,
  "data": {
    "session_uuid": "xxx-xxx-xxx",
    "stream_url": "/api/interview/xxx-xxx-xxx/stream?token=yyy"
  }
}

// Error 40201: 配额不足
// Error 40202: 已有进行中面试
```

### GET /api/interview/{uuid}/stream — SSE 面试流

**连接方式**: EventSource，token 放 query param

**事件格式**（每条必须有 id 用于重连）:
```
id: 1
event: status
data: {"state":"PLANNING","progress":"0/10","elapsed":0}

id: 2
event: question
data: {"round":1,"content":"请介绍一下你对微服务架构的理解","type":"initial","dimension":"专业知识"}

id: 3
event: thinking
data: {"content":"正在分析你的回答..."}

id: 4
event: evaluation
data: {"round":1,"score":7,"brief":"回答较完整，缺少实际案例","visible":false}

id: 5
event: question
data: {"round":2,"content":"你提到了服务拆分，具体怎么确定拆分粒度？","type":"probe","dimension":"问题解决"}

id: 20
event: report
data: {"session_uuid":"xxx","overall_score":72,"report_url":"/api/interview/xxx/report"}

id: 21
event: done
data: {}
```

**特殊事件**:
```
id: 0
event: connected
data: {"session_uuid":"xxx","resumed_from":0}

event: error
data: {"code":"LLM_TIMEOUT","message":"AI 响应超时，正在重试...","retry":true}

:ping
```

**重连**: 客户端发送 `Last-Event-ID: 5`，服务端从 Redis sse_log 恢复，从 id:6 开始推送。

**心跳**: 每 15s 发送 `:ping` 注释

**超时**: 
- 用户 5min 无操作 → event:reminder
- 用户 15min 无操作 → event:paused，Agent 状态冻结

### POST /api/interview/{uuid}/answer — 提交回答

```json
// Request
{ "content": "我认为应该用消息队列解耦...", "type": "text" }
// type: text | audio_url

// Response 200
{ "code": 0, "data": { "received": true, "round": 3 } }
// 实际响应通过 SSE 推送
```

### POST /api/interview/{uuid}/skip — 跳过当前题

```json
// Response 200
{ "code": 0, "data": { "skipped": true, "round": 3 } }
```

### POST /api/interview/{uuid}/end — 主动结束

```json
// Response 200
{ "code": 0, "data": { "status": "reporting" } }
// 报告生成后通过 SSE event:report 推送
```

### GET /api/interview/{uuid}/report — 获取报告

```json
// Response 200
{
  "code": 0,
  "data": {
    "session_uuid": "xxx",
    "industry": "互联网",
    "position": "后端工程师",
    "mode": "tech",
    "difficulty": 3,
    "duration_sec": 1800,
    "total_rounds": 10,
    "overall_score": 72,
    "dimensions": { "专业知识": 8, "逻辑表达": 7, "问题解决": 6, "沟通能力": 8, "抗压能力": 7 },
    "summary": "整体表现中上...",
    "strengths": ["表达清晰", "案例具体"],
    "improvements": ["缺少量化数据", "系统设计深度不够"],
    "rounds": [
      {
        "round": 1,
        "question": "...",
        "answer": "...",
        "score": 7,
        "evaluation": { "strengths": [...], "weaknesses": [...], "suggestion": "..." }
      }
    ],
    "share_image_url": null,
    "created_at": "2026-06-05T..."
  }
}
```

### GET /api/interview/history — 面试历史

```json
// Query: ?page=1&page_size=20
// Response 200
{
  "code": 0,
  "data": {
    "items": [
      {
        "session_uuid": "xxx",
        "industry": "互联网",
        "position": "后端工程师",
        "mode": "tech",
        "status": "completed",
        "final_score": 72,
        "duration_sec": 1800,
        "total_rounds": 10,
        "started_at": "2026-06-05T..."
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 20,
    "has_more": false
  }
}
```

### GET /api/interview/active — 获取当前进行中面试

```json
// Response 200 (有进行中面试)
{
  "code": 0,
  "data": {
    "session_uuid": "xxx",
    "state": "QUESTIONING",
    "round": 4,
    "started_at": "...",
    "stream_url": "/api/interview/xxx/stream?token=yyy"
  }
}

// Response 200 (无进行中面试)
{ "code": 0, "data": null }
```

---

## 4. 支付模块 `/api/payment`

### GET /api/payment/plans — 获取定价方案

```json
// Response 200
{
  "code": 0,
  "data": [
    { "product_type": "monthly", "name": "月卡", "price": 29.00, "original_price": 29.00, "description": "无限面试+完整报告" },
    { "product_type": "yearly", "name": "年卡", "price": 199.00, "original_price": 348.00, "description": "月卡全部+专属题库" },
    { "product_type": "single", "name": "单次", "price": 5.00, "original_price": 5.00, "description": "单次面试" }
  ]
}
```

### POST /api/payment/create — 创建支付订单

```json
// Request
{
  "product_type": "monthly",
  "coupon_id": 123            // 可选
}

// Response 200
{
  "code": 0,
  "data": {
    "order_uuid": "xxx",
    "order_no": "PROBE20260605001",
    "pay_amount": 29.00,
    "discount_amount": 0,
    "wx_pay_params": {         // 微信支付 JSAPI 参数
      "appId": "...",
      "timeStamp": "...",
      "nonceStr": "...",
      "package": "prepay_id=...",
      "signType": "RSA",
      "paySign": "..."
    }
  }
}
```

### POST /api/payment/webhook — 微信支付回调（不鉴权，验签）

```
微信回调 → 验签 → 更新 payment 状态 → 
  创建/续期 subscription → 更新 user membership → 
  返回 success
```

### GET /api/payment/orders — 支付记录

```json
// Query: ?page=1&page_size=20
// Response 200 (分页)
{
  "code": 0,
  "data": {
    "items": [
      {
        "order_uuid": "xxx",
        "product_type": "monthly",
        "pay_amount": 29.00,
        "status": "paid",
        "created_at": "...",
        "paid_at": "..."
      }
    ],
    "total": 3, "page": 1, "page_size": 20, "has_more": false
  }
}
```

---

## 5. 订阅模块 `/api/subscription`

### GET /api/subscription/current — 当前订阅状态

```json
// Response 200
{
  "code": 0,
  "data": {
    "plan": "monthly",
    "status": "active",
    "started_at": "2026-06-01T...",
    "expire_at": "2026-07-01T...",
    "auto_renew": true,
    "days_remaining": 26
  }
}

// 未订阅
{ "code": 0, "data": null }
```

### PUT /api/subscription/auto-renew — 开关自动续费

```json
// Request
{ "auto_renew": false }

// Response 200
{ "code": 0, "data": { "auto_renew": false } }
```

---

## 6. 优惠券模块 `/api/coupon`

### GET /api/coupon/mine — 我的优惠券

```json
// Query: ?status=unused (unused/used/expired/all)
// Response 200
{
  "code": 0,
  "data": [
    {
      "id": 1,
      "name": "新用户 7 天体验",
      "coupon_type": "free_days",
      "value": 7,
      "status": "unused",
      "expire_at": "2026-06-30T..."
    }
  ]
}
```

### POST /api/coupon/redeem — 兑换优惠券码

```json
// Request
{ "code": "WELCOME2026" }

// Response 200
{ "code": 0, "data": { "coupon_id": 1, "name": "新用户 7 天体验", "expire_at": "..." } }
```

---

## 7. 邀请模块 `/api/invite`

### GET /api/invite/my-code — 获取我的邀请码

```json
// Response 200
{
  "code": 0,
  "data": {
    "code": "ABCD1234",
    "reward_description": "每邀请1人，双方各得3次免费面试",
    "total_invited": 5,
    "total_reward": 15
  }
}
```

### GET /api/invite/records — 邀请记录

```json
// Response 200
{
  "code": 0,
  "data": [
    { "invitee_nickname": "用户A", "reward_given": true, "created_at": "..." }
  ]
}
```

---

## 8. 通知模块 `/api/notification`

### GET /api/notification/list — 通知列表

```json
// Query: ?page=1&page_size=20&unread_only=true
// Response 200 (分页)
{
  "code": 0,
  "data": {
    "items": [
      { "id": 1, "title": "面试报告已生成", "type": "system", "is_read": false, "related_url": "/report/xxx", "created_at": "..." }
    ],
    "total": 10, "page": 1, "page_size": 20, "has_more": false
  }
}
```

### GET /api/notification/unread-count — 未读数量

```json
{ "code": 0, "data": { "count": 3 } }
```

### PUT /api/notification/{id}/read — 标记已读

```json
{ "code": 0, "data": { "read": true } }
```

### PUT /api/notification/read-all — 全部已读

```json
{ "code": 0, "data": { "updated": 5 } }
```

---

## 9. 成就模块 `/api/achievement`

### GET /api/achievement/list — 成就列表

```json
// Response 200
{
  "code": 0,
  "data": [
    {
      "code": "first_interview",
      "name": "初试啼声",
      "description": "完成第一次面试",
      "icon": "🎤",
      "achieved": true,
      "achieved_at": "2026-06-05T..."
    },
    {
      "code": "score_90",
      "name": "面霸",
      "description": "单次面试得分超过 90",
      "icon": "🏆",
      "achieved": false,
      "achieved_at": null
    }
  ]
}
```

---

## 10. 分享模块 `/api/share`

### POST /api/share/generate-image — 生成分享图

```json
// Request
{ "session_uuid": "xxx", "template": "radar" }
// template: radar(雷达图) / score_card(成绩单) / achievement(成就卡)

// Response 200
{
  "code": 0,
  "data": {
    "image_url": "https://cdn.probe.app/share/xxx.png",
    "share_id": 123
  }
}
```

### POST /api/share/record — 记录分享行为

```json
// Request
{ "share_id": 123, "channel": "wechat_moments" }

// Response 200
{ "code": 0, "data": { "recorded": true } }
```

### GET /api/share/callback/{share_id} — 分享链接被点击

```
(无需登录，记录 click_count)
→ 302 redirect 到 App 落地页
```

---

## 11. 反馈模块 `/api/feedback`

### POST /api/feedback — 提交反馈

```json
// Request
{
  "session_uuid": "xxx",     // 可选，对某次面试的反馈
  "rating": 4,
  "comment": "追问很到位，但有一题评分不准",
  "feedback_type": "interview"
}

// Response 200
{ "code": 0, "data": { "id": 1 } }
```

---

## 12. 语音模块 `/api/speech` (Phase 2)

### POST /api/speech/transcribe — 语音转文字

```
Content-Type: multipart/form-data
字段: file (音频文件)

限制:
  - 格式: wav, mp3, webm, m4a
  - 最大: 25MB
  - 最长: 5 分钟

// Response 200
{ "code": 0, "data": { "text": "我认为应该...", "duration_sec": 45 } }
```

### GET /api/speech/tts — 文字转语音

```
Query: ?text=请介绍一下你的项目经历&voice=female
限制: text 最长 500 字

// Response 200
Content-Type: audio/mpeg
Body: 音频流
```

---

## 13. 文件模块 `/api/file`

### POST /api/file/upload — 上传文件

```
Content-Type: multipart/form-data
字段: file, type (avatar/audio_input)

限制:
  - 头像: jpg/png, 最大 5MB
  - 音频: wav/mp3/webm/m4a, 最大 25MB

// Response 200
{ "code": 0, "data": { "file_uuid": "xxx", "url": "https://cdn.probe.app/..." } }
```

### GET /api/file/{uuid} — 获取文件

```
→ 302 redirect to CDN URL
或直接返回文件流（小文件）
```

---

## 14. 配额模块 `/api/quota`

### GET /api/quota/status — 配额状态

```json
// Response 200
{
  "code": 0,
  "data": {
    "plan": "free",
    "quota_total": 3,
    "quota_used": 1,
    "quota_remaining": 2,
    "reset_at": "2026-07-01T00:00:00Z",
    "can_start_interview": true
  }
}
```

---

## 15. 面试趋势 `/api/interview/stats` (新增)

### GET /api/interview/stats — 最近 N 次分数趋势

```json
// Query: ?limit=20
// Response 200
{
  "code": 0,
  "data": {
    "items": [
      {"session_uuid": "xxx", "score": 72, "mode": "tech", "date": "2026-06-05T..."}
    ],
    "total_completed": 5,
    "avg_score": 68.2,
    "best_score": 85
  }
}
```

---

## 变更记录

| 日期 | 变更 |
|------|------|
| 2026-06-12 | 新增: POST /api/auth/register, POST /api/auth/login (邮箱密码认证) |
| 2026-06-12 | 新增: POST /api/auth/wechat (微信登录，dev mock) |
| 2026-06-12 | 新增: GET /api/interview/stats (趋势数据) |
| 2026-06-12 | 新增: 支付模块 (/api/payment/plans, create, webhook, orders, subscription/current) |
| 2026-06-12 | 新增: 语音模块 (/api/speech/transcribe, tts) |
| 2026-06-12 | 新增: 邀请模块 (/api/invite/my-code, redeem, records) |
| 2026-06-12 | 新增: 通知模块 (/api/notification/list, unread-count, {id}/read, read-all) |
| 2026-06-12 | 新增: 优惠券模块 (/api/coupon/mine, redeem) |
| 2026-06-12 | 新增: 成就模块 (/api/achievement/list) |
| 2026-06-12 | LLM 改为 MiMo (小米) API，base_url: token-plan-cn.xiaomimimo.com |
