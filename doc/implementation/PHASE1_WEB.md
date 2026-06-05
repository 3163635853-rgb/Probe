# Phase 1 — Web 前端任务清单

> 框架: Next.js 14 + Tailwind CSS + TypeScript
> 目标: 4 周交付可用的 Web 面试界面
> 依赖: 后端 API 就绪 (Week 1-2 可用 mock)

---

## Week 1-2: 项目搭建 + 基础页面 (与后端并行)

### W1.1 — 项目初始化
- [ ] create-next-app --typescript --tailwind
- [ ] 目录结构:
  ```
  web/
  ├── app/
  │   ├── layout.tsx          — 全局 layout
  │   ├── page.tsx            — 首页/落地页
  │   ├── login/page.tsx
  │   ├── interview/
  │   │   ├── setup/page.tsx  — 面试配置(选岗位)
  │   │   ├── [uuid]/page.tsx — 面试进行中
  │   │   └── [uuid]/report/page.tsx — 报告
  │   └── history/page.tsx    — 面试历史
  ├── components/
  ├── lib/
  │   ├── api.ts              — API 请求封装
  │   ├── sse.ts              — SSE 客户端
  │   ├── auth.ts             — token 管理
  │   └── types.ts            — 类型定义
  └── public/
  ```
- [ ] Dockerfile (standalone output)
- [ ] 环境变量: NEXT_PUBLIC_API_URL

**验证**: `npm run dev` 能跑，页面能渲染

### W1.2 — 基础设施层
- [ ] lib/api.ts:
  - fetchAPI(path, options) — 统一请求封装
  - 自动带 Authorization header
  - 统一错误处理 (code !== 0 抛异常)
  - token 过期检测 (401 → 跳登录)
  - X-New-Token 自动更新本地 token
- [ ] lib/auth.ts:
  - getToken() / setToken() / clearToken() — localStorage
  - isLoggedIn() → boolean
  - AuthGuard 组件 (未登录跳 /login)
- [ ] lib/sse.ts:
  - createSSE(url, handlers) — EventSource 封装
  - 自动重连 + Last-Event-ID
  - 事件分发: onQuestion, onEvaluation, onReport, onError, onDone
  - 连接状态管理: connecting / connected / reconnecting / closed
- [ ] lib/types.ts — 所有 API 响应的 TypeScript 类型

**验证**: API 工具层完整，类型定义覆盖 API.md 所有响应

### W1.3 — 登录页
- [ ] /login — 微信扫码登录
  - 开发模式: 一键 mock 登录按钮 (跳过微信)
  - 调用 POST /api/auth/wechat
  - 登录成功 → 存 token → 跳 /interview/setup
- [ ] 全局 AuthGuard — 未登录自动跳转

**验证**: mock 登录可用，token 正确存储，保护页面不可直接访问

---

## Week 2-3: 核心页面

### W2.1 — 面试配置页 `/interview/setup`
- [ ] 步骤式选择器 UI:
  1. 选行业 (GET /api/config/industries → 卡片网格)
  2. 选岗位 (GET /api/config/positions?industry_id=x → 列表)
  3. 选模式 (GET /api/config/modes → 卡片)
  4. 选难度 (GET /api/config/difficulties → 滑块或卡片)
  5. 粘贴 JD (textarea, 可选, 可跳过)
  6. 确认开始 → POST /api/interview/start
- [ ] 配额显示 (GET /api/quota/status → "本月剩余 2 次")
- [ ] 配额不足提示 (引导升级)
- [ ] 已有进行中面试检测 (GET /api/interview/active → 提示继续)

**验证**: 能走完选择流程，成功创建面试 session

### W2.2 — 面试页 `/interview/[uuid]`
- [ ] 布局: 顶部进度条 + 计时器 | 中间对话流 | 底部输入区
- [ ] SSE 连接管理:
  - 页面加载 → 建立 SSE 连接
  - 接收 event:question → 显示 AI 提问 (打字机效果)
  - 接收 event:thinking → 显示"正在分析..."
  - 接收 event:status → 更新进度条和计时器
  - 接收 event:error → 显示错误提示 (可重试)
  - 接收 event:done → 跳转报告页
- [ ] 用户输入:
  - textarea 输入 + 发送按钮
  - 发送 → POST /api/interview/{uuid}/answer
  - 发送后禁用输入 (等 AI 回复)
  - 跳过按钮 → POST /api/interview/{uuid}/skip
- [ ] 结束面试按钮 → POST /api/interview/{uuid}/end + 确认弹窗
- [ ] 断线重连 UI (显示"连接中..." + 自动恢复)
- [ ] 页面离开提示 (beforeunload)

**验证**: 能流畅完成一次 8-10 题的面试对话，打字机效果流畅

### W2.3 — 报告页 `/interview/[uuid]/report`
- [ ] GET /api/interview/{uuid}/report 获取数据
- [ ] 布局:
  - 顶部: 总分 (大数字) + 通过/待提升 标签
  - 雷达图: 5 维度得分 (用 Chart.js 或 recharts)
  - 维度卡片: 每个维度得分 + 一句话评价
  - 逐题详情: 折叠面板 (问题 → 我的回答 → AI 点评 → 得分)
  - 改进建议: 列表
  - 底部: 再来一次 / 分享 / 返回首页
- [ ] 分享按钮 (Phase 1 先做复制链接，分享图 Phase 2)
- [ ] 加载状态 (报告生成中 → 轮询或从 SSE 获取)

**验证**: 报告数据完整渲染，雷达图正确展示

### W2.4 — 历史页 `/history`
- [ ] GET /api/interview/history (分页)
- [ ] 列表卡片: 岗位 + 模式 + 得分 + 日期 + 状态
- [ ] 点击跳转报告详情
- [ ] 空状态: "还没有面试记录，开始第一次面试吧"
- [ ] 下拉加载更多 (or 分页按钮)

**验证**: 能看到历史记录，点击能跳到对应报告

---

## Week 3-4: 完善 + 适配 + 部署

### W3.1 — 错误与边界处理
- [ ] 全局错误边界 (Error Boundary)
- [ ] 网络断开提示 (offline detection)
- [ ] LLM 超时提示 (event:error 展示 + 重试按钮)
- [ ] token 过期: 自动跳登录 + 提示
- [ ] 404 页面
- [ ] 空状态设计 (无数据时的友好提示)

### W3.2 — 响应式 + 移动端
- [ ] 所有页面手机端适配 (Tailwind responsive)
- [ ] 面试页输入框: 移动端键盘弹出不遮挡
- [ ] 触摸优化 (按钮大小, 点击区域)
- [ ] 测试: iPhone Safari + Android Chrome

**验证**: 手机浏览器能流畅完成面试

### W3.3 — SEO + 性能
- [ ] metadata: title, description, og:image (每页)
- [ ] 落地页 SSR (首页静态渲染)
- [ ] 图片优化 (next/image)
- [ ] 字体优化 (next/font)
- [ ] Loading UI (Suspense + skeleton)

### W3.4 — 构建部署
- [ ] `next build` 无报错
- [ ] Dockerfile (multi-stage, standalone output)
- [ ] 环境变量验证
- [ ] 前后端联调全流程测试

**验证**: 构建产物可在 Docker 中运行，所有页面功能正常

---

## 组件清单

| 组件 | 用途 |
|------|------|
| `ChatBubble` | 对话气泡 (AI / 用户 两种样式) |
| `TypeWriter` | 打字机效果文本 |
| `RadarChart` | 五维雷达图 |
| `ProgressBar` | 面试进度条 (当前题/总题) |
| `Timer` | 计时器 |
| `StepSelector` | 步骤式选择器 (行业→岗位→模式) |
| `ScoreCard` | 单维度得分卡片 |
| `RoundDetail` | 逐题详情折叠面板 |
| `QuotaBadge` | 配额剩余提示 |
| `ConnectionStatus` | SSE 连接状态指示器 |
| `EmptyState` | 空数据状态 |
| `ConfirmModal` | 确认弹窗 (结束面试等) |

---

## 状态管理

Phase 1 用 React Context + useReducer，不上 Redux/Zustand:

```
AuthContext — token + user 信息
InterviewContext — 当前面试状态 (SSE 事件驱动)
```

---

## 前端依赖 API 端点汇总

| 页面 | 调用的 API |
|------|-----------|
| 登录 | POST /api/auth/wechat |
| 配置 | GET /config/industries, /positions, /modes, /difficulties |
| 配额 | GET /api/quota/status |
| 开始面试 | POST /api/interview/start, GET /api/interview/active |
| 面试中 | GET .../stream (SSE), POST .../answer, .../skip, .../end |
| 报告 | GET /api/interview/{uuid}/report |
| 历史 | GET /api/interview/history |
| 个人 | GET /api/auth/me, PUT /api/auth/profile |
| 反馈 | POST /api/feedback |
