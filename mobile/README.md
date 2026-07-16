# Probe Mobile

Expo SDK 52 + React Native + TypeScript 移动端。

## 快速开始

```bash
cd mobile
npm install
npx expo start
```

扫码用 Expo Go 打开，或按 `i`/`a` 启动模拟器。

## 环境变量

复制 `.env.example` 为 `.env`，填入后端地址：

```
EXPO_PUBLIC_API_URL=https://api.probe.app
```

## 项目结构

```
app/           # expo-router 文件路由
  (auth)/      # 登录（未认证用户）
  (main)/      # Tab 导航（首页/历史/我的）
  interview/   # 面试配置/对话/报告
  notifications/
  feedback/
components/    # 复用组件
lib/           # 基础设施（api/auth/sse/hooks/audio/notifications）
```

## 构建

```bash
npx eas build --profile preview   # 内测包
npx eas build --profile production # 正式包
```

## 技术决策

- nativewind (TailwindCSS for RN) — 和 Web 共享色板
- react-native-reanimated + moti — 声明式动画
- lucide-react-native — 图标
- react-native-sse — SSE polyfill（RN 无原生 EventSource）
- expo-secure-store — token 安全存储
- expo-audio — 语音录制/播放
