@AGENTS.md

# Mobile App 开发注意事项

## 关键约束
- expo-router 文件路由：路由结构 = 文件结构，不要手动注册
- nativewind v4：className 直接写 Tailwind，但只支持 RN 兼容的属性
- react-native-sse 泛型：自定义事件名用联合类型字符串，不是对象
- FormData 上传：RN 的 FormData.append 需要 `as unknown as Blob` hack
- babel.config.js 里配 reanimated/plugin，不要放 app.json plugins

## API 路径
所有 API 路径以 `/` 开头（不含 `/api` 前缀），`fetchAPI` 会拼接 BASE_URL。
`EXPO_PUBLIC_API_URL` 包含 `/api` 前缀，后端实际路径是 `https://api.probe.app/api/auth/login` 等。

## 安全
- Token 存 expo-secure-store，不存 AsyncStorage
- SSE 连接通过 Authorization header 认证，不走 URL query param
- 所有 TextInput 必须有 maxLength
- 所有按钮操作需要 loading/disabled 防重复
