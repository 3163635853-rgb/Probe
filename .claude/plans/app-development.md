# Probe App 完整开发计划

## 总体原则

- 极简：不引入多余的库和抽象，RN 生态够用就行
- 复用：types.ts 直接拷贝，api.ts 适配一层 storage 差异即可
- 自检：每个里程碑结束后 `npx expo start` 确认编译通过
- 生产级：错误边界、离线处理、安全存储、TypeScript strict

## 技术栈（锁定版本）

| 依赖 | 版本 | 用途 |
|------|------|------|
| expo | ~52 | 框架 |
| expo-router | ~4 | 文件路由 |
| nativewind | ~4 | Tailwind for RN |
| expo-secure-store | ~14 | token 安全存储 |
| expo-av | ~15 | 语音录制/播放 |
| expo-notifications | ~0.29 | 推送 |
| expo-haptics | ~14 | 震动反馈 |
| react-native-svg | ~15 | 雷达图 |
| react-native-sse | ~1 | SSE polyfill |

## 开发顺序（6 轮迭代）

### Round 1: 项目骨架 + 基础设施
- `npx create-expo-app@latest mobile --template tabs`
- 安装核心依赖（nativewind, expo-router, expo-secure-store）
- 配置 nativewind（复用 Web 色板）
- `lib/types.ts` — 直接复制 Web 的
- `lib/api.ts` — 适配 expo-secure-store 替代 localStorage
- `lib/auth.ts` — SecureStore 版 token 管理
- `app.json` 基础配置
- 验证：expo start 编译通过

### Round 2: 认证 + Tab 导航 + 首页
- Root layout (AuthProvider + AuthGuard)
- (auth)/login.tsx — 邮箱登录表单
- (main)/_layout.tsx — Bottom Tab (首页/历史/我的)
- (main)/home.tsx — 开始面试入口 + 配额显示
- 验证：能登录、看到 Tab 导航、首页数据加载

### Round 3: 面试配置 + 对话核心
- interview/setup.tsx — 行业→岗位→模式→难度 步骤流
- lib/sse.ts — react-native-sse 封装
- interview/[uuid].tsx — 对话 UI (消息列表 + 输入框 + SSE)
- ChatBubble 组件
- 键盘适配（KeyboardAvoidingView）
- 验证：能完成一次文字面试

### Round 4: 报告 + 历史 + 个人中心
- interview/[uuid]/report.tsx — 总分 + 雷达图 + 逐题
- RadarChart 组件 (react-native-svg)
- (main)/history.tsx — 面试记录列表
- (main)/profile.tsx — 用户信息 + 退出登录
- 验证：报告数据完整、历史列表正确

### Round 5: 语音面试 + 推送
- lib/audio.ts — expo-av 录音/播放封装
- VoiceRecorder 组件（按住录音 + 波形）
- AudioPlayer 组件（播放 TTS）
- lib/notifications.ts — 推送注册
- 验证：语音录制→转写→回答 完整链路

### Round 6: 打磨 + 暗色模式 + 错误处理
- 暗色模式跟随系统 (useColorScheme)
- 全局错误边界 (ErrorBoundary)
- 离线状态提示 (@react-native-community/netinfo)
- 空状态组件
- Haptics 反馈
- app.json 最终配置（图标、splash scheme）
- 验证：全功能自检通过

## 文件结构

```
mobile/
├── app/
│   ├── _layout.tsx           # Root: providers + AuthGuard
│   ├── index.tsx             # 入口重定向
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   └── login.tsx
│   ├── (main)/
│   │   ├── _layout.tsx       # Tab 导航
│   │   ├── home.tsx
│   │   ├── history.tsx
│   │   └── profile.tsx
│   └── interview/
│       ├── setup.tsx
│       ├── [uuid].tsx
│       └── [uuid]/report.tsx
├── components/
│   ├── ChatBubble.tsx
│   ├── VoiceRecorder.tsx
│   ├── AudioPlayer.tsx
│   ├── RadarChart.tsx
│   └── ErrorBoundary.tsx
├── lib/
│   ├── types.ts              # 复制自 Web
│   ├── api.ts                # 适配 SecureStore
│   ├── auth.ts               # SecureStore 版
│   ├── sse.ts                # RN SSE polyfill
│   ├── audio.ts              # 录音+播放
│   └── notifications.ts      # 推送
├── constants/
│   └── colors.ts             # 设计 token
├── app.json
├── eas.json
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

## 每轮自检清单

1. TypeScript 编译无错误 (`npx tsc --noEmit`)
2. Expo 启动不报红屏 (`npx expo start`)
3. 无 any 类型逃逸（除 FormData hack）
4. 所有 API 调用有错误处理
5. 无硬编码 URL/token

## 后续扩展点（不做，但预留接口）

- 微信登录：login.tsx 留按钮位，调用逻辑后续加
- 支付：profile.tsx 会员状态展示已有，支付流后续接
- OTA 更新：EAS Update 配置后续加
- 国际化：文案直接写中文，不做 i18n 抽象
