# 生产上线检查清单

> 最后更新：2026-07-16

## 已完成

- [x] 后端 Python 全量编译和 16 项 pytest 自动化测试
- [x] Web ESLint 零错误零警告、Next.js 生产构建
- [x] Mobile TypeScript、Expo ESLint、Expo Doctor 与 `/api` Base URL 链路
- [x] 微信支付 API v3 JSAPI/H5 下单、请求签名、响应/回调验签、AES-GCM 解密、幂等履约
- [x] 优惠券校验、锁定、失败释放和支付成功核销
- [x] 月卡/年卡续期、单次面试配额入账与履约重试标记
- [x] 服务端分享图、持久化文件、分享记录和点击统计
- [x] 头像完整 URL、公开缓存读取和上传文件持久卷
- [x] SSE ticket、Bearer Header 和旧 query token 三层认证回退
- [x] Alembic 新迁移与 19 张 ORM 表对齐
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
