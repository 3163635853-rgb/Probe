# 材料分发说明

---

## 给后端工程师

| 文件 | 用途 |
|------|------|
| `architecture/API.md` | **接口契约** — 所有端点、请求响应格式、错误码、SSE 协议 |
| `architecture/DATABASE.md` | **数据库设计** — 全部表结构、Redis Key、FAISS、Lua 脚本 |
| `architecture/PROMPTS.md` | **Prompt 工程** — 各子智能体 Prompt 设计 + LLM 参数 |
| `architecture/ARCHITECTURE.md` | **参考** — Agent 状态机、系统全景 (理解上下文) |
| `implementation/PHASE1_BACKEND.md` | **任务清单** — 按周拆好的后端 Task |
| `implementation/DEPLOY.md` | **部署** — Docker Compose、环境变量、CI/CD |

**一句话**: API.md 是你的输出规范，DATABASE.md 是你的数据层，BACKEND.md 是你的执行清单。

---

## 给前端工程师

| 文件 | 用途 |
|------|------|
| `architecture/API.md` | **接口契约** — 所有端点、请求响应格式、错误码、SSE 事件 |
| `implementation/PHASE1_WEB.md` | **任务清单** — 按周拆好的前端 Task + 组件清单 |
| `architecture/ARCHITECTURE.md` | **参考** — 用户流程、系统全景 (理解产品) |

**一句话**: API.md 是你的数据来源，WEB.md 是你的执行清单。不需要看数据库和部署。

---

## 你自己留着

| 文件 | 用途 |
|------|------|
| `implementation/PHASE1_TASKS.md` | **总协调** — 周计划、前后端依赖、对齐点 |
| `business/COMPETITIVE.md` | **商业** — 竞品分析、市场定位、定价 |
| `implementation/DEPLOY.md` | **运维** — 服务器、监控、备份 |
| 全部文件 | 你是唯一看全貌的人 |

---

## 核心共用文件

```
API.md — 前后端唯一的对齐契约
        后端照着实现，前端照着调用
        改了必须同步通知双方
```

---

## 交付方式建议

```
后端: 给 6 个文件，说"API.md 是硬标准，改接口先改文档再写代码"
前端: 给 3 个文件，说"API.md 是数据格式，Week 1-2 可以先 mock，Week 2 末切真实接口"
你:   每周对一次，检查对齐点是否达成
```
