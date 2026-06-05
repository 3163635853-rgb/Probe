---
name: fastapi-agent
description: "FastAPI + async Python best practices for AI agent backends. Use when building API routes, SSE streaming, database operations, or LLM service integrations. Covers async patterns, SQLAlchemy 2.0, Redis, SSE, error handling, and production deployment."
---

# FastAPI Agent Backend

## Project Structure

```
backend/
├── main.py              — app factory, middleware, lifespan
├── config.py            — pydantic Settings (from env vars)
├── api/
│   ├── deps.py          — get_db, get_current_user, get_redis
│   ├── auth.py
│   ├── interview.py
│   └── ...
├── agent/
│   ├── core.py          — Agent main loop
│   ├── planner.py
│   ├── prober.py
│   ├── evaluator.py
│   └── prompts/
├── models/              — SQLAlchemy models
├── services/            — External service wrappers (LLM, WeChat)
├── db/                  — Connection factories
└── utils/               — JWT, helpers
```

## Async Patterns

### Database (SQLAlchemy 2.0 async)
```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

engine = create_async_engine(DATABASE_URL, pool_size=10, max_overflow=20)
AsyncSession = async_sessionmaker(engine, expire_on_commit=False)

# Dependency
async def get_db():
    async with AsyncSession() as session:
        yield session
```

### Redis
```python
import redis.asyncio as redis

pool = redis.ConnectionPool.from_url(REDIS_URL, max_connections=50)

async def get_redis():
    return redis.Redis(connection_pool=pool)
```

### SSE Streaming
```python
from fastapi.responses import StreamingResponse
from asyncio import Queue

async def event_generator(session_id: str, last_event_id: int = 0):
    # Replay missed events from Redis
    missed = await redis.lrange(f"sse_log:{session_id}", last_event_id, -1)
    for event in missed:
        yield event.decode()
    
    # Live events
    seq = last_event_id + len(missed)
    while True:
        # Wait for new event or timeout (heartbeat)
        event = await wait_for_event(session_id, timeout=15)
        if event is None:
            yield ":ping\n\n"
            continue
        seq += 1
        formatted = f"id: {seq}\nevent: {event['type']}\ndata: {json.dumps(event['data'])}\n\n"
        await redis.rpush(f"sse_log:{session_id}", formatted)
        yield formatted

@router.get("/interview/{uuid}/stream")
async def stream(uuid: str, token: str, last_event_id: int = Header(0, alias="Last-Event-ID")):
    user = verify_token(token)
    return StreamingResponse(
        event_generator(uuid, last_event_id),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )
```

## Error Handling

```python
from fastapi import HTTPException

# Business errors — use structured response
class BizError(Exception):
    def __init__(self, code: int, message: str):
        self.code = code
        self.message = message

@app.exception_handler(BizError)
async def biz_error_handler(request, exc):
    return JSONResponse({"code": exc.code, "message": exc.message, "data": None})

# Examples
raise BizError(40201, "配额不足，本月免费次数已用完")
raise BizError(40202, "已有进行中的面试")
```

## LLM Service Pattern

```python
from openai import AsyncOpenAI

client = AsyncOpenAI(base_url="https://api.deepseek.com", api_key=DEEPSEEK_KEY)

async def stream_chat(messages: list, **params) -> AsyncGenerator[str, None]:
    response = await client.chat.completions.create(
        messages=messages, stream=True, timeout=30, **params
    )
    async for chunk in response:
        if chunk.choices[0].delta.content:
            yield chunk.choices[0].delta.content

async def chat_json(messages: list, **params) -> dict:
    response = await client.chat.completions.create(
        messages=messages, stream=False, timeout=30,
        response_format={"type": "json_object"}, **params
    )
    return json.loads(response.choices[0].message.content)
```

## JWT Pattern

```python
import jwt
from datetime import datetime, timedelta

def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> int:
    payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
    return int(payload["sub"])
```

## Testing

```python
# Use pytest + httpx for async tests
import pytest
from httpx import AsyncClient

@pytest.fixture
async def client():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

async def test_health(client):
    resp = await client.get("/health")
    assert resp.json()["status"] == "ok"
```

## Production Checklist

- [ ] All env vars loaded via pydantic Settings (validated at startup)
- [ ] Structured JSON logging (structlog)
- [ ] Request ID middleware (X-Request-ID header)
- [ ] CORS configured for frontend domain only
- [ ] Graceful shutdown (lifespan context manager)
- [ ] Health check includes DB/Redis ping
- [ ] Rate limiting middleware active
- [ ] Alembic migrations tested
