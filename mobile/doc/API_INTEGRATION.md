# App 端 API 接入清单

> 对照 backend/BACKEND.md 的 44 个端点，标注 App 端接入状态

## 已接入（18 个）

| # | 端点 | App 文件 | 备注 |
|---|------|---------|------|
| 1 | POST /api/auth/login | lib/auth-context.tsx | 正常 |
| 2 | GET /api/auth/me | lib/auth-context.tsx | 正常 |
| 3 | GET /config/industries | app/interview/setup.tsx | 正常 |
| 4 | GET /config/positions | app/interview/setup.tsx | 正常 |
| 5 | GET /config/modes | app/interview/setup.tsx | 带 category 参数 |
| 6 | GET /config/difficulties | app/interview/setup.tsx | 正常 |
| 7 | POST /interview/start | app/interview/setup.tsx | 正常 |
| 8 | GET /interview/{uuid}/stream | app/interview/[uuid].tsx | SSE via react-native-sse |
| 9 | POST /interview/{uuid}/answer | app/interview/[uuid].tsx | 正常 |
| 10 | POST /interview/{uuid}/skip | app/interview/[uuid].tsx | 正常 |
| 11 | POST /interview/{uuid}/end | app/interview/[uuid].tsx | 正常 |
| 12 | GET /interview/{uuid}/report | app/interview/[uuid]/report.tsx | 正常 |
| 13 | GET /interview/history | app/(main)/history.tsx + home.tsx | 正常 |
| 14 | GET /interview/active | lib/startup.ts | 正常 |
| 15 | GET /quota/status | app/(main)/home.tsx | 正常 |
| 16 | POST /speech/transcribe | components/VoiceRecorder.tsx | 通过 uploadFile |
| 17 | GET /speech/tts | components/AudioPlayer.tsx | URL 方式 |
| 18 | PUT /notification/read-all + /notification/{id}/read | app/notifications/ | 正常 |

## 需要接入（5 个 — P2/P3）

| # | 端点 | 优先级 | 接入方案 |
|---|------|--------|---------|
| 1 | GET /payment/plans + POST /payment/create | P2 | 会员中心页面 |
| 2 | GET /subscription/current | P2 | 个人中心会员状态 |
| 3 | GET /invite/my-code + POST /invite/redeem | P2 | 邀请奖励页 |
| 10 | GET /coupon/mine + POST /coupon/redeem | P3 | 优惠券页面 |
| 11 | GET /achievement/list | P3 | 成就系统 |

## 不需要接入（App 侧）

| 端点 | 原因 |
|------|------|
| POST /payment/webhook | 服务端回调 |
| GET /share/callback/{id} | 服务端 302 重定向 |
| POST /file/upload + GET /file/{uuid} | 仅头像上传场景，后续随 profile 编辑接入 |
| GET /health | 运维端点 |
| POST /auth/wechat | Phase 3 微信小程序 |
| POST /share/generate-image + POST /share/record | 已用 RN Share API 替代 |

## App 端请求体与后端不匹配（需修复）

| 问题 | 修复 |
|------|------|
| POST /feedback 缺少 `rating` 和 `feedback_type` 字段 | 加 rating 滑块 + type 选择 |
| SSE 未使用 ticket 认证（后端推荐 ticket 优先） | 调用 POST /api/auth/ticket 获取后传 ?ticket= |
| GET /notification/list 未传 unread_only 参数 | 传参优化 |
| POST /user/push-token 路径不在 BACKEND.md（是 API_APP.md 的） | 确认后端已实现 |
