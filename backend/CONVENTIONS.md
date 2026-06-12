# 后端代码规范

> 适用于 `backend/` 目录下所有 Python 代码。每次写代码前必须遵守。

---

## 1. Import 规范

- 所有 import 放文件顶部，禁止函数体内 import
- 唯一例外：避免循环导入时可在函数内延迟导入，但必须加注释 `# 延迟导入避免循环`
- 顺序：标准库 → 第三方 → 项目内部，每组之间空一行

```python
import json
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from config import settings
from db.mysql import get_db
from models.user import User
```

---

## 2. SQLAlchemy 规范

- Boolean 列过滤用 `.is_(True)` / `.is_(False)`，不用 `== True` / `== False`
- 禁止循环内逐条查询（N+1），批量用 `WHERE id IN (...)`
- 原子更新用 `UPDATE ... SET col = col + 1 WHERE condition`，不用先读再写
- 类型标注和实际存储一致：存 list 标 `Optional[list]`，存 dict 标 `Optional[dict]`

---

## 3. API 响应格式

所有业务接口统一返回：

```python
{"code": 0, "data": ..., "message": "ok"}
```

错误时：

```python
{"code": 40201, "message": "配额不足", "detail": "..."}
```

禁止返回缺少 `data` 字段的响应。

---

## 4. 异常处理

- 调用 LLM（chat/chat_json/evaluate/probe/report）必须 try/except，提供降级逻辑
- except 范围尽量小，至少 log warning/error，禁止裸 `except: pass`
- SSE 流中的异常必须转为 error 事件推给客户端，不能静默断流

```python
try:
    result = await evaluate(...)
except Exception as e:
    logger.warning(f"Evaluation failed: {e}")
    result = {"score": 5, "strengths": [], "weaknesses": ["评估异常"], "suggestion": ""}
```

---

## 5. 安全规范

- 密码用 bcrypt 哈希，禁止明文存储
- JWT secret 生产环境必须配置，启动时检查
- Webhook 非 DEBUG 模式必须验签
- 订单号用随机值，禁止包含用户内部 ID
- Redis 操作放在 DB commit 之后（防事务回滚后数据不一致）
- `request.client` 可能为 None，必须做空值保护
- payload 字段用 `.get()` 读取，不用 `[]` 直接取

---

## 6. 时间处理

- 统一用 `datetime.now(timezone.utc)`，禁止 `datetime.utcnow()`（Python 3.12 已弃用）
- Model 默认值用 `default=lambda: datetime.now(timezone.utc)` 或 `server_default=func.now()`

---

## 7. 配置管理

- 所有可变配置走 `config.py`（pydantic-settings），从环境变量/.env 读取
- 禁止在代码中硬编码 URL、端口、密钥、CORS 域名
- 开发默认值可以有，但生产必须通过环境变量覆盖

---

## 8. SSE 流规范

- 每条事件必须有自增 `id`，写入 Redis sse_log 供重连恢复
- 心跳每 15s 发 `:ping\n\n` 保活
- Agent 循环异常必须 catch 并推 error 事件，不能让流静默断开
- context 为空时推 SESSION_EXPIRED error + done，不能静默 return

---

## 9. 命名约定

- 文件名：小写下划线（`interview_stream.py`）
- 类名：PascalCase（`InterviewSession`）
- 函数/变量：snake_case（`get_current_user`）
- 常量：UPPER_SNAKE（`SESSION_TTL = 7200`）
- API 路由：`/api/{module}/{action}`，RESTful 风格

---

## 10. 日志规范

- 用 structlog JSON 格式输出
- LLM 调用记录 token 消耗
- 降级/异常必须 log，级别：warning（可恢复）/ error（不可恢复）
- 禁止 log 用户密码、token 原文等敏感信息
