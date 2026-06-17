# 后端接口文档

> 最后更新: 2026-06-12
> 框架: Python 3.12 + FastAPI + uv
> LLM: MiMo (小米) — token-plan-cn.xiaomimimo.com/v1
> 路由: 44 个端点 | 数据库: 19 表 (MySQL 8.0 + Redis 7)

---

## 快速启动

```bash
cd backend
docker compose -f ../docker-compose.dev.yml up -d mysql redis
uv run alembic upgrade head && uv run python -m db.seed
uv run uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 认证方式

| 场景 | 方式 |
|------|------|
| 普通 API | `Authorization: Bearer <JWT>` |
| SSE 流 | `?ticket=<one-time>` 优先，`?token=<JWT>` 兼容 |
| Token 续签 | 到期前 24h 自动续签，响应头 `X-New-Token` |

---

## 通用响应格式

```json
{"code": 0, "data": {...}}                    // 成功
{"code": 0, "data": {"items":[], "total":N, "page":1, "page_size":20, "has_more":false}}  // 分页
{"code": 40201, "message": "配额不足"}        // 错误
```

| 错误码范围 | 类别 |
|-----------|------|
| 40001-40099 | 认证/权限 |
| 40101-40199 | 参数校验 |
| 40201-40299 | 业务逻辑 |
| 40301-40399 | 支付 |
| 42900 | 限流 (60/min 登录用户, 30/min 未登录) |
| 50001-50099 | 服务端 |

---

## 1. 认证 `/api/auth`

### POST /api/auth/register — 邮箱注册

**场景：** Web 端用户注册入口

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | EmailStr | 是 | 注册邮箱 |
| password | string | 是 | 6-72 位 |
| nickname | string | 否 | 默认取邮箱前缀 |

```json
→ {"code":0,"data":{"token":"eyJ...","expires_at":"...","user":{...},"is_new_user":true}}
```
错误: 40102 密码不合规 / 40103 邮箱已注册

---

### POST /api/auth/login — 邮箱登录

**场景：** 已注册用户登录

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | EmailStr | 是 | |
| password | string | 是 | |

```json
→ {"code":0,"data":{"token":"eyJ...","expires_at":"...","user":{...},"is_new_user":false}}
```
错误: 40001 邮箱或密码错误

---

### POST /api/auth/wechat — 微信登录

**场景：** 小程序/公众号登录，自动创建或关联用户

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| code | string | 是 | wx.login() 返回的 code |
| invite_code | string | 否 | 邀请码 |

```json
→ 同 register 响应格式
```
错误: 40001 微信授权失败 / 50003 未配置微信登录

---

### POST /api/auth/ticket — 获取 SSE 一次性凭证

**场景：** SSE 无法设 Header，用短期 ticket 替代 JWT 传递认证，防止 token 泄露到日志/浏览器历史

需认证: 是

```json
→ {"code":0,"data":{"ticket":"abc...","expires_in":30}}
```

---

### GET /api/auth/me — 获取当前用户

**场景：** 进入应用后加载用户信息、配额、会员状态

需认证: 是

```json
→ {"code":0,"data":{"uuid":"...","nickname":"...","avatar":null,"phone":null,"membership_type":"free","membership_expire_at":null,"quota_remaining":3,"total_interviews":5,"created_at":"..."}}
```

---

### PUT /api/auth/profile — 更新资料

**场景：** 用户修改昵称/头像

需认证: 是

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| nickname | string | 否 | |
| avatar | string | 否 | URL |

```json
→ {"code":0,"data":{"updated":true}}
```

---

## 2. 配置 `/api/config`

无需认证。面试开始前加载选项。

### GET /config/industries — 行业列表
```json
→ {"code":0,"data":[{"id":1,"name":"互联网","icon":"...","description":"..."}]}
```

### GET /config/positions?industry_id=1 — 岗位列表
```json
→ {"code":0,"data":[{"id":1,"name":"后端工程师","category":"tech","level":"mid","default_difficulty":3}]}
```

### GET /config/modes?category=tech — 面试模式
```json
→ {"code":0,"data":[{"code":"tech","name":"技术面","description":"...","default_rounds":10,"default_duration_min":30}]}
```

### GET /config/difficulties — 难度列表
```json
→ {"code":0,"data":[{"level":1,"name":"入门","description":"适合应届"},{"level":3,"name":"中级","description":"1-3年"},{"level":5,"name":"专家","description":"5年+"}]}
```

---

## 3. 面试核心 `/api/interview`

### POST /interview/start — 开始面试

**场景：** 用户选完行业/岗位/模式后发起面试，原子扣配额、创建会话、返回 SSE 地址

需认证: 是

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| industry_id | int | 是 | |
| position_id | int | 是 | |
| mode | string | 否 | 默认 "mixed" |
| difficulty | int | 否 | 1-5，默认 3 |
| jd_text | string | 否 | JD 原文，辅助出题 |

```json
→ {"code":0,"data":{"session_uuid":"550e...","stream_url":"/api/interview/550e.../stream?token=eyJ..."}}
```
错误: 40201 配额不足 / 40202 已有进行中面试

---

### GET /interview/{uuid}/stream — SSE 面试实时流

**场景：** 面试全程实时通道，推送题目、评分、状态、报告

认证: `?ticket=` 或 `?token=`
Header: `last-event-id` (断线重连)

事件流:
```
id:1  event:connected   data:{"session_uuid":"...","resumed_from":0}
id:2  event:status      data:{"state":"PLANNING","progress":"0/10"}
id:3  event:question    data:{"round":1,"content":"请介绍...","type":"initial","dimension":"专业知识"}
id:4  event:thinking    data:{"content":"正在分析..."}
id:5  event:evaluation  data:{"round":1,"score":7,"brief":"...","visible":false}
id:6  event:question    data:{"round":1,"content":"追问...","type":"probe"}
...
id:N  event:report      data:{"session_uuid":"...","overall_score":75,"report_url":"..."}
id:N+1 event:done       data:{}
```

特殊事件: `error`(DUPLICATE_CONNECTION/SESSION_EXPIRED/INTERNAL_ERROR), `reminder`(5min 无操作), `:ping`(15s 心跳)

排他锁: 同一 session 只允许一个 SSE 连接

---

### POST /interview/{uuid}/answer — 提交回答

**场景：** 用户输入回答，Agent 消费后推进流程

需认证: 是

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| content | string | 是 | 最长 5000 字 |
| type | string | 否 | "text"(默认) |

```json
→ {"code":0,"data":{"received":true,"round":2}}
```

### POST /interview/{uuid}/skip — 跳过

```json
→ {"code":0,"data":{"skipped":true,"round":2}}
```

### POST /interview/{uuid}/end — 主动结束

```json
→ {"code":0,"data":{"status":"reporting"}}
```

### GET /interview/{uuid}/report — 获取报告

**场景：** 面试结束后查看完整评估报告

```json
→ {"code":0,"data":{"session_uuid":"...","industry":"互联网","position":"后端工程师","mode":"tech","difficulty":3,"duration_sec":1800,"total_rounds":10,"overall_score":72,"dimensions":{"专业知识":8,"逻辑表达":7},"summary":"...","strengths":["..."],"improvements":["..."],"rounds":[{"round":1,"question":"...","answer":"...","score":7,"evaluation":{}}],"share_image_url":null,"created_at":"..."}}
```

### GET /interview/history?page=1&page_size=20 — 历史

```json
→ {"code":0,"data":{"items":[{"session_uuid":"...","industry":"...","position":"...","mode":"...","status":"completed","final_score":72,"duration_sec":1800,"total_rounds":10,"started_at":"..."}],"total":5,"page":1,"page_size":20,"has_more":false}}
```

### GET /interview/active — 进行中面试

**场景：** 刷新页面时恢复进行中的面试

```json
→ {"code":0,"data":{"session_uuid":"...","state":"QUESTIONING","round":3,"started_at":"...","stream_url":"..."}}
→ {"code":0,"data":null}  // 无进行中
```

### GET /interview/stats?limit=20 — 分数趋势

**场景：** 主页展示进步曲线

```json
→ {"code":0,"data":{"items":[{"session_uuid":"...","score":72,"mode":"tech","date":"..."}],"total_completed":10,"avg_score":74.5,"best_score":89}}
```

---

## 4. 配额 `/api/quota`

### GET /quota/status — 配额状态

**场景：** 判断能否开始面试、展示剩余次数

需认证: 是

```json
→ {"code":0,"data":{"plan":"free","unlimited":false,"quota_total":3,"quota_used":1,"quota_remaining":2,"reset_at":"2026-07-01T00:00:00Z","can_start_interview":true}}
```

付费用户: `"unlimited":true, "quota_total":-1, "quota_remaining":-1`

---

## 5. 支付 `/api/payment`

### GET /payment/plans — 定价方案

无需认证

```json
→ {"code":0,"data":[{"product_type":"monthly","name":"月卡","price":29.00,"original_price":29.00,"description":"无限面试+完整报告"}]}
```

### POST /payment/create — 创建订单

需认证: 是

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| product_type | string | 是 | monthly/yearly/single |
| coupon_id | int | 否 | 优惠券 ID |

```json
→ {"code":0,"data":{"order_uuid":"...","order_no":"PROBE...","pay_amount":29.0,"discount_amount":0,"wx_pay_params":null}}
```

### POST /payment/webhook — 支付回调

微信服务器调用，非 DEBUG 模式需验签

### GET /payment/orders — 支付记录 (分页)

---

## 6. 订阅 `/api/subscription`

### GET /subscription/current — 当前订阅

```json
→ {"code":0,"data":{"plan":"monthly","status":"active","started_at":"...","expire_at":"...","auto_renew":false,"days_remaining":19}}
```

### PUT /subscription/auto-renew — 切换自动续费

| 参数 | 类型 | 必填 |
|------|------|------|
| auto_renew | bool | 是 |

---

## 7. 邀请 `/api/invite`

### GET /invite/my-code — 获取我的邀请码

**场景：** 分享页展示邀请码和统计

```json
→ {"code":0,"data":{"code":"ABCD1234","reward_description":"每邀请1人，双方各得3次","total_invited":5,"total_reward":15}}
```

### POST /invite/redeem — 兑换邀请码

| 参数 | 类型 | 必填 |
|------|------|------|
| code | string | 是 |

```json
→ {"code":0,"data":{"reward":"+3次面试机会"}}
```
错误: 40102 无效 / 40203 已使用过 / 不能用自己的

### GET /invite/records — 邀请记录

---

## 8. 通知 `/api/notification`

### GET /notification/list?page=1&unread_only=false — 通知列表 (分页)
### GET /notification/unread-count — 未读数
### PUT /notification/{id}/read — 标记已读
### PUT /notification/read-all — 全部已读

---

## 9. 优惠券 `/api/coupon`

### GET /coupon/mine?status=unused — 我的优惠券
### POST /coupon/redeem — 兑换券码

| 参数 | 类型 | 必填 |
|------|------|------|
| code | string | 是 |

---

## 10. 成就 `/api/achievement`

### GET /achievement/list — 成就列表

**场景：** 展示全部成就 + 用户已达成状态

```json
→ {"code":0,"data":[{"code":"first_interview","name":"初试啼声","description":"完成第一次面试","icon":"...","achieved":true,"achieved_at":"..."}]}
```

---

## 11. 语音 `/api/speech`

### POST /speech/transcribe — 语音转文字 (Whisper)

multipart/form-data, file 字段, 最大 25MB

```json
→ {"code":0,"data":{"text":"我认为...","duration_sec":45}}
```

### GET /speech/tts?text=你好&voice=female — 文字转语音 (Edge TTS)

voice: "female"(默认)/"male"/具体 Azure voice ID

响应: `audio/mpeg` 音频流

---

## 12. 文件 `/api/file`

### POST /file/upload?type=avatar — 上传文件

类型限制: avatar(jpg/png/webp, 5MB) / audio_input(wav/mp3/webm/m4a, 25MB)

```json
→ {"code":0,"data":{"file_uuid":"...","url":"/api/file/..."}}
```

### GET /file/{uuid} — 获取文件 (需认证, UUID 格式校验)

---

## 13. 分享 `/api/share`

### POST /share/generate-image — 生成分享图
### POST /share/record — 记录分享行为
### GET /share/callback/{id} — 分享点击回调 (无需认证, 302 重定向)

---

## 14. 反馈 `/api/feedback`

### POST /feedback — 提交反馈

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| session_uuid | string | 否 | 对哪次面试的反馈 |
| rating | int | 是 | 1-5 |
| comment | string | 否 | 最长 2000 字 |
| feedback_type | string | 否 | interview/bug/suggestion |

```json
→ {"code":0,"data":{"id":1}}
```

---

## 15. 健康检查

### GET /health

```json
→ {"status":"ok","mysql":"ok","redis":"ok"}
```
