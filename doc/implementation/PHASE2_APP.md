# Phase 2 — App 开发任务清单 (Expo / React Native)

> 技术栈: Expo SDK 52 + React Native + TypeScript
> 目标: 3 周交付 iOS + Android App
> 核心差异点: 语音面试 + 推送通知（Web 没有的）

---

## 技术决策

| 决策 | 选择 | 理由 |
|------|------|------|
| 框架 | Expo (managed workflow) | 零原生配置、OTA 更新、EAS 云构建 |
| 导航 | expo-router (文件路由) | 和 Next.js 同模式，降低心智负担 |
| 状态 | React Context + useReducer | 和 Web 一致，不引入新库 |
| UI | Tailwind (nativewind) | 和 Web 共享设计 token |
| 语音录制 | expo-av | Expo 内置，无需 eject |
| 推送 | expo-notifications | 统一 iOS/Android 推送 |
| 存储 | expo-secure-store | token 安全存储 |
| 构建 | EAS Build | 云端出包，不需要 Mac |

---

## 项目结构

```
mobile/
├── app/                          # expo-router 文件路由
│   ├── _layout.tsx               # Root layout (providers)
│   ├── index.tsx                 # 启动页/引导页
│   ├── (auth)/
│   │   └── login.tsx             # 登录 (邮箱 + 微信)
│   ├── (main)/
│   │   ├── _layout.tsx           # Tab 导航
│   │   ├── home.tsx              # 首页 (开始面试入口)
│   │   ├── history.tsx           # 面试历史
│   │   └── profile.tsx           # 个人中心
│   ├── interview/
│   │   ├── setup.tsx             # 面试配置
│   │   ├── [uuid].tsx            # 面试对话 (SSE + 语音)
│   │   └── [uuid]/report.tsx     # 面试报告
│   └── +not-found.tsx
├── components/
│   ├── ChatBubble.tsx
│   ├── VoiceRecorder.tsx         # 录音组件
│   ├── AudioPlayer.tsx           # TTS 播放
│   ├── RadarChart.tsx            # 雷达图 (react-native-svg)
│   ├── ProgressRing.tsx
│   └── ScoreToast.tsx
├── lib/
│   ├── api.ts                    # 复用 Web 的 fetchAPI 逻辑
│   ├── sse.ts                    # EventSource polyfill (RN 没原生支持)
│   ├── auth.ts                   # expo-secure-store 版
│   ├── types.ts                  # 直接复用 Web 的
│   ├── audio.ts                  # 录音 + 播放封装
│   └── notifications.ts          # 推送注册 + 处理
├── assets/                       # 图标、splash
├── app.json                      # Expo 配置
├── eas.json                      # EAS Build 配置
├── tailwind.config.ts            # nativewind
└── package.json
```

---

## Week 1: 骨架 + 核心页面

### M1.1 — 项目初始化
- [ ] `npx create-expo-app mobile --template tabs-typescript`
- [ ] 安装: nativewind, expo-router, expo-secure-store, react-native-svg
- [ ] 配置 nativewind (tailwind.config.ts 复用 Web 的 color tokens)
- [ ] app.json: 名称 Probe、图标、splash、scheme
- [ ] lib/api.ts: 从 Web 复制，改 BASE_URL 为环境变量
- [ ] lib/types.ts: 直接复用 Web 的
- [ ] lib/auth.ts: 用 expo-secure-store 替换 localStorage

**验证**: `npx expo start` 能跑，扫码在手机上看到 Tab 导航

### M1.2 — 登录 + 认证
- [ ] (auth)/login.tsx: 邮箱登录/注册表单
- [ ] 微信登录 (expo-wechat 或 WebView 方案)
- [ ] 登录成功 → token 存 SecureStore → 跳 (main)
- [ ] Root layout: AuthGuard 逻辑 (无 token → 跳登录)

**验证**: 能登录拿到 token，重启 App 自动登录

### M1.3 — 首页 + 面试配置
- [ ] (main)/home.tsx: 开始面试按钮 + 最近面试 + 配额提示
- [ ] interview/setup.tsx: 行业→岗位→模式→难度→JD（同 Web 流程）
- [ ] 调用配置 API + 配额 API

**验证**: 能选完配置，点开始创建 session

### M1.4 — 面试对话页
- [ ] lib/sse.ts: RN 的 EventSource polyfill (`react-native-sse` 或自实现 fetch streaming)
- [ ] interview/[uuid].tsx: 对话流 UI (ChatBubble + 打字机 + 进度环)
- [ ] 输入框 + 发送/跳过/结束
- [ ] 键盘弹出适配 (KeyboardAvoidingView)
- [ ] 后台保活: AppState 监听，后台不断 SSE

**验证**: 手机上能完成一次文字面试

---

## Week 2: 语音 + 报告 + 历史

### M2.1 — 语音面试
- [ ] lib/audio.ts: expo-av 录音封装 (start/stop/getUri)
- [ ] components/VoiceRecorder.tsx: 按住录音 / 点击录音，波形动画
- [ ] 录音完成 → POST /api/speech/transcribe (上传音频文件)
- [ ] 转写结果作为 answer 发送
- [ ] components/AudioPlayer.tsx: 播放 AI 提问 (GET /api/speech/tts)
- [ ] 面试配置页加「语音模式」开关

**验证**: 能用语音完成一次面试

### M2.2 — 报告页
- [ ] interview/[uuid]/report.tsx: 总分 + 雷达图 + 维度卡片 + 逐题展开
- [ ] components/RadarChart.tsx: react-native-svg 绘制
- [ ] 分享: 截图 → react-native-view-shot → Share API
- [ ] 对话回放 tab

**验证**: 报告页数据完整，雷达图正确，能分享图片

### M2.3 — 历史 + 个人中心
- [ ] (main)/history.tsx: 面试记录列表 + 分数趋势折线图
- [ ] (main)/profile.tsx: 用户信息 + 会员状态 + 设置 + 退出登录
- [ ] 暗色模式跟随系统 (Appearance API)

**验证**: 所有 Tab 页功能完整

---

## Week 3: 推送 + 打磨 + 发布

### M3.1 — 推送通知
- [ ] lib/notifications.ts: expo-notifications 注册推送 token
- [ ] 推送 token 上报后端 (需要后端加一个接口)
- [ ] 通知场景: 面试报告生成完成、邀请奖励到账、每日提醒
- [ ] 点击通知跳转到对应页面 (deep link)

### M3.2 — 体验打磨
- [ ] Haptics 反馈 (发送/评分时震动)
- [ ] 页面切换动画 (expo-router 内置)
- [ ] 离线状态处理 (NetInfo)
- [ ] 错误边界 + 空状态
- [ ] 加载骨架屏
- [ ] App 图标 + Splash 设计

### M3.3 — 构建发布
- [ ] eas.json 配置 (development/preview/production)
- [ ] EAS Build: iOS + Android 构建
- [ ] TestFlight (iOS) / Internal Testing (Android) 内测
- [ ] App Store / Google Play 上架准备 (截图、描述、隐私政策)

**验证**: TestFlight/Internal Testing 能安装使用

---

## App 和 Web 共享的代码

| 文件 | 共享方式 |
|------|---------|
| `lib/types.ts` | 直接复制（类型定义完全一致） |
| `lib/api.ts` | 90% 复用（改 BASE_URL + storage 接口） |
| API 调用逻辑 | 完全一致（同一个后端） |
| 设计 token (颜色) | tailwind.config 共享色板 |

## App 独有的

| 能力 | 实现 |
|------|------|
| 语音录制 | expo-av |
| TTS 播放 | expo-av + 后端 /speech/tts |
| 推送通知 | expo-notifications |
| 安全存储 | expo-secure-store |
| 分享图片 | react-native-view-shot + Share |
| 震动反馈 | expo-haptics |
| 后台保活 | AppState + 重连 |

---

## 后端需要新增的接口

| 接口 | 用途 |
|------|------|
| POST /api/user/push-token | App 上报推送 token |
| POST /api/notification/send (内部) | 触发推送发送 |

其余接口全部复用现有 Web API，零改动。

---

## 完成标准

```
✅ iOS + Android 真机能跑
✅ 文字面试完整流程 (同 Web)
✅ 语音面试可用 (录音→转写→回答)
✅ AI 语音播报 (TTS)
✅ 推送通知 (报告完成通知)
✅ 报告雷达图 + 分享图
✅ 暗色模式跟随系统
✅ TestFlight / Internal Testing 可安装
```
