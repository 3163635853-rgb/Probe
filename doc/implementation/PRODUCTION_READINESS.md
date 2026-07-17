# 生产上线检查清单

> 最后更新：2026-07-16

## 已完成

- [x] 后端 Python 全量编译和 29 项 pytest 自动化测试
- [x] Web ESLint 零错误零警告、Next.js 生产构建
- [x] Mobile TypeScript、Expo ESLint、Expo Doctor 与 `/api` Base URL 链路
- [x] 微信支付 API v3 JSAPI/H5 下单、请求签名、响应/回调验签、AES-GCM 解密、幂等履约
- [x] 优惠券校验、锁定、失败释放和支付成功核销
- [x] 月卡/年卡续期、单次面试配额入账与履约重试标记
- [x] 服务端分享图、持久化文件、分享记录和点击统计
- [x] 头像完整 URL、公开缓存读取和上传文件持久卷
- [x] SSE ticket、Bearer Header 和旧 query token 三层认证回退
- [x] App 1.1.0 成长中心全栈模块与 29 项后端测试
- [x] Alembic 新迁移与 21 张 ORM 表对齐（含邀请双方奖励履约字段）
- [x] CI 覆盖 backend tests/migrations、Web lint/build、Mobile check、Compose config
- [x] CD 在启动应用前执行迁移，并在健康失败时输出日志和终止
- [x] Docker Compose 去除废弃 version 字段，分享图片使用独立持久卷

## 上线前必须由运维提供的外部材料

代码已经完成，但真实支付必须在服务器秘密目录和环境变量中放入商户材料：

1. `secrets/wechat/apiclient_key.pem`：商户 API 私钥
2. `secrets/wechat/wechatpay_public_key.pem`：微信支付公钥（或平台证书 PEM）
3. `.env` 中设置 `WECHAT_PAY_MCH_ID`、`WECHAT_PAY_MCH_SERIAL_NO`、`WECHAT_PAY_PUBLIC_KEY_ID`
4. `.env` 中设置 32 字节 `WECHAT_PAY_API_V3_KEY`
5. 微信商户平台配置支付回调：`https://api.probe.app/api/payment/webhook`
6. 商户平台配置 H5 支付域名和 JSAPI 支付授权目录
7. `WX_APP_ID` 必须与产生用户 openid 的公众号/小程序 AppID 对应
8. 配置 `TRANSCRIPTION_API_KEY`、`TRANSCRIPTION_BASE_URL` 和 `TRANSCRIPTION_MODEL`，语音识别不能指向纯文本 LLM 端点

这些是第三方商户凭证，不能写入 Git；缺失时支付接口会安全返回 503，而不会退化为模拟支付。

## 部署验证

```bash
docker compose config --quiet
docker compose build backend web
docker compose up -d mysql redis
docker compose run --rm backend uv run alembic upgrade head
docker compose up -d backend web caddy
curl -fsS https://api.probe.app/health
```

## 2026-07-17 新增代码闭环

- [x] 追问回答评估、持久化和报告汇总
- [x] 最近 12 场报告聚合为长期能力画像，并注入下一场 Planner
- [x] 成就自动发放，报告/成就/邀请/支付/每日提醒站内通知
- [x] Expo Push 点击路由、Android 通知频道和无 EAS ID 安全降级
- [x] 邀请奖励 Redis Lua 幂等发放、数据库状态补偿和客户端登录后自动重试
- [x] FAISS 不可用时 MySQL 题库检索兜底，健康接口暴露索引状态
- [x] Web 开放平台 OAuth 与 Mobile 微信 OAuth 回调链路
- [x] 隐私政策、用户协议和 Mobile 全局离线提示

仍需由账号/平台所有者提供：微信开放平台审核信息、EAS Project ID、应用商店签名与商店后台材料。这些不是可提交到 Git 的代码。
