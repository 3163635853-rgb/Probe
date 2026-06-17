# 前端接口接入状态对比

> 对比 `backend/BACKEND.md` 中的 44 个端点与 `web/` 前端实际调用情况
> 最后更新: 2026-06-12

---

## 接入状态图例

- ✅ 已接入 — 前端有对应调用且类型匹配
- ⚠️ 部分接入 — 调用了但参数/响应处理有差异
- ❌ 未接入 — 前端没调用（页面存在但未对接此接口）
- 🚫 不需要 — 前端不需要调用（后端内部/回调接口）

---

## 1. 认证 `/api/auth`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| POST /auth/register | ✅ | `login/page.tsx` | 参数匹配 |
| POST /auth/login | ✅ | `login/page.tsx` | 参数匹配 |
| POST /auth/wechat | ✅ | `login/page.tsx` | OAuth 回调处理 |
| POST /auth/ticket | ✅ | `interview/[uuid]/page.tsx` | SSE 连接前换 ticket |
| GET /auth/me | ✅ | `AuthProvider.tsx` | 初始化加载用户信息 |
| PUT /auth/profile | ❌ | — | 缺少用户资料编辑页面 |

---

## 2. 配置 `/api/config`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /config/industries | ✅ | `interview/setup/page.tsx` | |
| GET /config/positions | ✅ | `interview/setup/page.tsx` | |
| GET /config/modes | ✅ | `interview/setup/page.tsx` | |
| GET /config/difficulties | ✅ | `interview/setup/page.tsx` | |

---

## 3. 面试核心 `/api/interview`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| POST /interview/start | ✅ | `interview/setup/page.tsx` | |
| GET /interview/{uuid}/stream | ✅ | `interview/[uuid]/page.tsx` | 用 ticket 连接 |
| POST /interview/{uuid}/answer | ✅ | `interview/[uuid]/page.tsx` | |
| POST /interview/{uuid}/skip | ✅ | `interview/[uuid]/page.tsx` | |
| POST /interview/{uuid}/end | ✅ | `interview/[uuid]/page.tsx` + `setup/page.tsx` | |
| GET /interview/{uuid}/report | ✅ | `interview/[uuid]/report/page.tsx` | useFetch |
| GET /interview/history | ✅ | `history/page.tsx` | 分页 |
| GET /interview/active | ✅ | `interview/setup/page.tsx` | |
| GET /interview/stats | ❌ | — | 前端用 history 数据自己算趋势图，未调此接口 |

**⚠️ 差异点：**
- `POST /end` 返回 `{"status":"reporting"}`，但前端改成了等 SSE event:report 或 5s 超时 fallback，不依赖此字段
- `GET /interview/stats` 未使用 — 前端 history 页从 `/interview/history` 数据中提取分数画折线图。如果要用后端 stats 接口（有 avg_score、best_score），需要改 history 页

---

## 4. 配额 `/api/quota`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /quota/status | ✅ | `interview/setup/page.tsx` | |

**⚠️ 差异点：**
- 后端返回 `unlimited: true/false` 字段，前端当前只判断 `quota_remaining === -1`
- 建议前端改为 `quota.unlimited ? "无限" : ...` 更语义化

---

## 5. 支付 `/api/payment`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /payment/plans | ✅ | `pricing/page.tsx` | useFetch |
| POST /payment/create | ✅ | `pricing/page.tsx` | 含 coupon_id 参数 |
| POST /payment/webhook | 🚫 | — | 微信回调，前端不调 |
| GET /payment/orders | ❌ | — | 缺少支付记录页面 |

---

## 6. 订阅 `/api/subscription`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /subscription/current | ❌ | — | 缺少会员状态展示（应在 pricing 页或用户中心显示） |
| PUT /subscription/auto-renew | ❌ | — | 缺少自动续费开关 |

---

## 7. 邀请 `/api/invite`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /invite/my-code | ✅ | `invite/page.tsx` | useFetch |
| POST /invite/redeem | ⚠️ | `invite/page.tsx` | 前端调的是 `POST /coupon/redeem`，不是 `/invite/redeem` |
| GET /invite/records | ✅ | `invite/page.tsx` | useFetch |

**⚠️ 问题：** 邀请页兑换入口调用了 `POST /coupon/redeem`，但后端邀请码兑换是 `POST /invite/redeem`。需要修正。

---

## 8. 通知 `/api/notification`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /notification/list | ✅ | `notifications/page.tsx` | useFetch |
| GET /notification/unread-count | ❌ | — | AppShell 铃铛未显示未读数 |
| PUT /notification/{id}/read | ✅ | `notifications/page.tsx` | |
| PUT /notification/read-all | ✅ | `notifications/page.tsx` | |

---

## 9. 优惠券 `/api/coupon`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /coupon/mine | ✅ | `coupons/page.tsx` | useFetch + filter |
| POST /coupon/redeem | ✅ | `invite/page.tsx` | 实际应改为兑换优惠券码 |

---

## 10. 成就 `/api/achievement`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /achievement/list | ✅ | `achievements/page.tsx` | useFetch |

---

## 11. 语音 `/api/speech`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| POST /speech/transcribe | ❌ | — | Phase 2 语音功能，Web 端未实现录音 |
| GET /speech/tts | ❌ | — | Phase 2 语音功能，Web 端未实现播放 AI 语音 |

---

## 12. 文件 `/api/file`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| POST /file/upload | ❌ | — | 缺少头像上传功能 |
| GET /file/{uuid} | ❌ | — | 图片展示直接用 URL，不通过此接口 |

---

## 13. 分享 `/api/share`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| POST /share/generate-image | ❌ | — | 当前用 html2canvas 前端截图，未调后端 |
| POST /share/record | ❌ | — | 未实现分享行为记录 |
| GET /share/callback/{id} | 🚫 | — | 后端重定向，前端不调 |

---

## 14. 反馈 `/api/feedback`

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| POST /feedback | ✅ | `FeedbackModal.tsx` | 面试结束后评分 |

---

## 15. 健康检查

| 接口 | 前端接入 | 调用位置 | 备注 |
|------|---------|----------|------|
| GET /health | 🚫 | — | 运维用，前端不调 |

---

## 统计汇总

| 状态 | 数量 | 占比 |
|------|------|------|
| ✅ 已接入 | 28 | 64% |
| ⚠️ 部分接入/有差异 | 3 | 7% |
| ❌ 未接入 | 10 | 23% |
| 🚫 前端不需要 | 3 | 7% |
| **总计** | **44** | |

---

## 需要修复的问题

| # | 问题 | 优先级 | 修复方式 |
|---|------|--------|----------|
| 1 | 邀请页兑换码调错接口 | HIGH | `/coupon/redeem` → `/invite/redeem` |
| 2 | quota 判断逻辑 | MEDIUM | 加 `unlimited` 字段判断，不只看 -1 |
| 3 | AppShell 铃铛无未读数 | MEDIUM | 调 `GET /notification/unread-count` 显示 badge |

---

## 建议后续补充的页面/功能

| # | 功能 | 涉及接口 | 优先级 |
|---|------|----------|--------|
| 1 | 用户资料编辑页 | PUT /auth/profile + POST /file/upload | P1 |
| 2 | 订阅状态 + 自动续费开关 | GET /subscription/current + PUT auto-renew | P1 |
| 3 | 支付记录页 | GET /payment/orders | P2 |
| 4 | 语音面试（录音+播放） | POST /speech/transcribe + GET /speech/tts | P2 |
| 5 | 分享图走后端 | POST /share/generate-image + POST /share/record | P2 |
| 6 | 通知铃铛未读数 | GET /notification/unread-count | P1 |
