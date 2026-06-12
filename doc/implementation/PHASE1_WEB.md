# Phase 1 — Web 前端完成状态

> 框架: Next.js 16 + Tailwind CSS 4 + TypeScript 5
> 动画: framer-motion
> 图表: recharts
> 图标: lucide-react
> 状态: Phase 1 全部完成，Phase 2 页面骨架已搭建

---

## 已完成 ✓

### 基础设施
- [x] Next.js 项目 (standalone output + Dockerfile)
- [x] 设计系统 "Warm Confidence"（琥珀金主色 + 暖灰底 + Sora 字体）
- [x] 暗色模式（ThemeProvider + inline script 防 FOUC）
- [x] lib/api.ts — fetchAPI 封装（401 跳登录、X-New-Token 续签、非 2xx 错误处理）
- [x] lib/auth.ts — token 管理（localStorage）
- [x] lib/sse.ts — SSE 客户端（原生 EventSource 自动重连 + Last-Event-ID）
- [x] lib/hooks.ts — useFetch / useAsync 统一数据加载
- [x] lib/types.ts — 全量 API 类型定义
- [x] 全局 Toast 组件（顶部居中，slide-down 动画）
- [x] AppShell（桌面顶栏 + 移动端底部 Tab + 页面切换动画）
- [x] AuthGuard（路由保护）
- [x] AuthProvider（Context）
- [x] PageTransition（framer-motion 页面切换）
- [x] OfflineBanner（离线检测）
- [x] Error Boundary（global-error + error + not-found）
- [x] Favicon + Apple Touch Icon + OG Image

### 页面路由
| 路由 | 状态 | 说明 |
|------|------|------|
| `/` | ✓ | 落地页（Hero + 特性 + 流程 + Demo + 数据 + CTA） |
| `/login` | ✓ | 邮箱登录/注册 + 微信扫码 Tab |
| `/interview/setup` | ✓ | 步骤式选择器（行业→岗位→模式→难度→JD→确认） |
| `/interview/[uuid]` | ✓ | SSE 对话流 + 打字机 + 环形进度 + 评分浮层 + 双击结束 |
| `/interview/[uuid]/report` | ✓ | 雷达图 + 维度卡片 + 逐题详情 + 对话回放 Tab + 截图分享 |
| `/history` | ✓ | 分页列表 + 成绩趋势折线图 |
| `/pricing` | ✓ | 套餐卡片 + 微信 JSAPI 支付 |
| `/notifications` | ✓ | 通知列表 + 未读标记 + 全部已读 |
| `/invite` | ✓ | 邀请码展示/复制 + 兑换入口 + 记录 |
| `/coupons` | ✓ | 优惠券列表 + 可用/全部筛选 |
| `/achievements` | ✓ | 成就 grid（已解锁/未解锁） |

### 组件清单
| 组件 | 用途 |
|------|------|
| `AppShell` | 登录后导航框架（桌面顶栏 + 移动底部 Tab） |
| `AuthGuard` | 路由保护（未登录跳 /login） |
| `AuthProvider` | 认证 Context（token + user） |
| `ThemeProvider` | 主题 Context（light/dark） |
| `ThemeToggle` | 暗色模式切换按钮 |
| `Toast` / `useToast` | 全局消息提示（success/error/warning/info） |
| `PageTransition` | framer-motion 页面切换动画 |
| `FeedbackModal` | 面试结束后星级评分弹窗 |
| `ScrollReveal` | IntersectionObserver 滚动触发动画 |
| `CountUp` | 数字滚动动画 |
| `OfflineBanner` | 网络断开提示横幅 |

---

## 技术决策记录

| 决策 | 选择 | 理由 |
|------|------|------|
| 动画库 | framer-motion | 页面切换需要 AnimatePresence，CSS 不够用 |
| 图表 | recharts | 雷达图 + 折线图，React 生态最成熟 |
| 图标 | lucide-react | tree-shakeable，风格统一，1000+ 图标 |
| 状态管理 | Context + useFetch hook | Phase 1 够用，不上 Redux |
| 截图分享 | html2canvas（动态 import） | 按需加载不影响首屏 |
| SSE | 原生 EventSource | 浏览器内置重连 + Last-Event-ID，不需要库 |
| 主题 | CSS 变量 + class 切换 | 简单可靠，inline script 防闪烁 |

---

## 前端依赖 API 端点

| 页面 | 调用的 API |
|------|-----------|
| 登录 | POST /auth/login, POST /auth/register, POST /auth/wechat |
| 配置 | GET /config/industries, /positions, /modes, /difficulties |
| 配额 | GET /quota/status |
| 开始面试 | POST /interview/start, GET /interview/active |
| 面试中 | GET .../stream (SSE), POST .../answer, .../skip, .../end |
| 报告 | GET /interview/{uuid}/report |
| 历史 | GET /interview/history |
| 套餐 | GET /payment/plans, POST /payment/create |
| 通知 | GET /notification/list, PUT .../read, PUT .../read-all |
| 邀请 | GET /invite/my-code, GET /invite/records |
| 优惠券 | GET /coupon/mine, POST /coupon/redeem |
| 成就 | GET /achievement/list |
| 反馈 | POST /feedback |

---

## 编码规范

见 `.claude/memory/web-coding-standards.md`，核心规则：
- GET 用 `useFetch`，操作用 `fetchAPI` + try/catch + toast
- 图标用 lucide-react，颜色用 design token
- 禁止 window.confirm/alert、emoji、硬编码颜色、空 catch
- 页面切换用 framer-motion，滚动用 ScrollReveal
