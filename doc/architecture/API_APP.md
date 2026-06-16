# App API 规范

> App 复用 Web 的全部 API，本文档只列 App 独有的接口和差异点。

---

## 与 Web API 的差异

### 认证

| 差异 | Web | App |
|------|-----|-----|
| Token 存储 | localStorage | expo-secure-store |
| SSE 认证 | URL query param `?token=` | 同 Web（EventSource 限制） |
| 微信登录 | 扫码（网页授权） | App 内调起微信 SDK（open-type） |

### 请求头

App 额外发送：
```
X-Platform: ios | android
X-App-Version: 1.0.0
X-Device-Id: <uuid>
```

后端可用于：统计、灰度、强制更新判断。

---

## App 独有接口

### 1. POST /api/user/push-token — 上报推送 Token

```json
// Request
{
  "token": "ExponentPushToken[xxxxxxxxxxxxxx]",
  "platform": "ios",
  "device_id": "uuid"
}

// Response 200
{ "code": 0, "data": { "registered": true } }
```

**调用时机**: App 启动时 + 推送权限授权后

### 2. POST /api/speech/transcribe — 语音转文字

```
Content-Type: multipart/form-data
字段: file (音频文件)

App 特殊说明:
  - 格式: m4a (iOS 默认) 或 webm (Android)
  - expo-av 录音输出 URI → FormData upload
  - 最大 25MB / 5 分钟

// Response 200
{ "code": 0, "data": { "text": "我认为...", "duration_sec": 45 } }
```

### 3. GET /api/speech/tts — 文字转语音

```
Query: ?text=请介绍一下你的项目经历&voice=zh-CN-XiaoxiaoNeural

App 特殊说明:
  - 返回音频流 (audio/mpeg)
  - App 用 expo-av Audio.Sound 播放
  - 建议预加载下一题的 TTS（面试中提前请求）

// Response 200
Content-Type: audio/mpeg
Body: 音频二进制流
```

### 4. GET /api/config/app-version — App 版本检查

```json
// Response 200
{
  "code": 0,
  "data": {
    "latest_version": "1.0.1",
    "min_version": "1.0.0",
    "force_update": false,
    "update_url": "https://apps.apple.com/app/probe/id123456",
    "changelog": "修复语音面试偶尔断连"
  }
}
```

**逻辑**:
- `app_version < min_version` → 强制更新弹窗，不可跳过
- `app_version < latest_version && !force_update` → 提示可更新，可跳过

---

## App 调用现有 API 的注意事项

### SSE 面试流

React Native 没有原生 `EventSource`，需要 polyfill：

```typescript
// 方案 1: react-native-sse (推荐)
import EventSource from 'react-native-sse';

// 方案 2: fetch streaming
const response = await fetch(url);
const reader = response.body.getReader();
// 逐行解析 SSE 格式
```

### 文件上传 (语音)

```typescript
// expo-av 录音 → 得到 file URI
const { uri } = await recording.getURI();

// 构造 FormData
const formData = new FormData();
formData.append('file', {
  uri,
  name: 'recording.m4a',
  type: 'audio/m4a',
} as any);

// 上传
await fetch(`${API_URL}/speech/transcribe`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
  body: formData,
});
```

### 推送通知处理

```typescript
// 点击通知 → deep link 跳转
Notifications.addNotificationResponseReceivedListener(response => {
  const { screen, params } = response.notification.request.content.data;
  // screen: 'report' | 'notification' | 'home'
  router.push({ pathname: screen, params });
});
```

### 网络中断恢复

```typescript
// NetInfo 监听
NetInfo.addEventListener(state => {
  if (state.isConnected && sseDisconnected) {
    // 重连 SSE
    reconnectSSE();
  }
});
```

---

## 后端改动清单 (支持 App)

| # | 改动 | 文件 | 工作量 |
|---|------|------|--------|
| 1 | 新增 POST /api/user/push-token | 新建 api/push.py | 30min |
| 2 | 新增 GET /api/config/app-version | api/config.py 加一个端点 | 15min |
| 3 | 推送发送服务 | 新建 services/push.py (调 Expo Push API) | 1h |
| 4 | 报告完成时触发推送 | interview_stream.py REPORTING 阶段加调用 | 15min |
| 5 | users 表加 push_token/device_id 字段 | Alembic 迁移 | 15min |

总后端工作量: ~2h
