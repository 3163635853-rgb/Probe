# Phase 2 — Expo App 当前完成状态

> 最后核对：2026-07-17。原“三周开发计划”已执行完毕，本文件改为真实状态记录，避免历史未勾选框被误认为代码仍未实现。

## 已完成

- [x] Expo SDK 56、React Native 0.85、Expo Router、NativeWind
- [x] 邮箱登录/注册、SecureStore Token、AuthGuard、前后台 Token 复核
- [x] 微信 OAuth 登录入口、HTTPS 回调页和 App Deep Link 回跳
- [x] 首页、成长中心、历史、个人中心、会员、邀请、通知、成就、反馈
- [x] 面试配置、文字面试、SSE 重连、活跃面试恢复
- [x] 追问、跳过、结束、报告、对话回放
- [x] 语音录制转写和 AI TTS 播放
- [x] 雷达图、服务端分享图和系统分享面板
- [x] Expo Push Token 注册、Android 通知频道、冷启动/前台点击跳转
- [x] 报告、成就、邀请、支付和每日训练提醒通知链路
- [x] Haptics、页面动画、全局错误边界、空状态和离线横幅
- [x] 动态 `app.config.ts`、`eas.json`、iOS Bundle ID、Android Package
- [x] 隐私政策和用户协议入口
- [x] TypeScript、ESLint、Expo Doctor、Android/iOS Export 质量门禁

## 需要平台账号所有者完成

以下不是缺失代码，不能在仓库中伪造：

- [ ] 在 Expo/EAS 控制台创建项目并填写 `EXPO_PUBLIC_EAS_PROJECT_ID`
- [ ] 配置 Apple Developer / Google Play 签名凭证
- [ ] 在微信开放平台配置 AppID、Secret、OAuth 回调域名并完成审核
- [ ] 运行 EAS production build，上传 TestFlight / Google Play Internal Testing
- [ ] 在商店后台提交截图、年龄分级、隐私标签、客服与备案信息

## 发布命令

```bash
cd mobile
npm ci --legacy-peer-deps
npm run check
npm run bundle:check
npx eas build --profile preview
npx eas build --profile production
```

## 必需环境变量

```env
EXPO_PUBLIC_API_URL=https://api.probe.app/api
EXPO_PUBLIC_EAS_PROJECT_ID=your-eas-project-id
EXPO_PUBLIC_WECHAT_APP_ID=your-wechat-app-id
EXPO_PUBLIC_WECHAT_CALLBACK_URL=https://probe.app/auth/wechat/callback
```
