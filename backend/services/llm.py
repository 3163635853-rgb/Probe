import asyncio
import json
import time
from typing import AsyncGenerator
from openai import AsyncOpenAI
from config import settings

client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY or "sk-placeholder",
    base_url=settings.DEEPSEEK_BASE_URL,
    timeout=30.0,
)

# LLM 调用参数预设
CHAT_PARAMS = {"model": "deepseek-chat", "temperature": 0.7, "max_tokens": 1024}
EVAL_PARAMS = {"model": "deepseek-chat", "temperature": 0.2, "max_tokens": 512}
PLAN_PARAMS = {"model": "deepseek-chat", "temperature": 0.3, "max_tokens": 1024, "response_format": {"type": "json_object"}}


async def stream_chat(messages: list[dict], params: dict | None = None) -> AsyncGenerator[str, None]:
    """流式对话，逐 token 返回"""
    p = {**CHAT_PARAMS, **(params or {})}
    for attempt in range(2):
        try:
            response = await client.chat.completions.create(
                messages=messages, stream=True, **p
            )
            async for chunk in response:
                delta = chunk.choices[0].delta
                if delta.content:
                    yield delta.content
            return
        except Exception:
            if attempt == 0:
                await asyncio.sleep(2)
            else:
                raise


async def chat(messages: list[dict], params: dict | None = None) -> str:
    """非流式对话，返回完整文本"""
    p = {**CHAT_PARAMS, **(params or {})}
    p.pop("stream", None)
    for attempt in range(2):
        try:
            response = await client.chat.completions.create(
                messages=messages, stream=False, **p
            )
            return response.choices[0].message.content or ""
        except Exception:
            if attempt == 0:
                await asyncio.sleep(2)
            else:
                raise


async def chat_json(messages: list[dict], params: dict | None = None) -> dict:
    """强制 JSON 输出，返回解析后的 dict"""
    p = {**PLAN_PARAMS, **(params or {})}
    text = await chat(messages, p)
    # 尝试解析 JSON
    text = text.strip()
    if text.startswith("```"):
        # Strip markdown code fence
        lines = text.split("\n")
        text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
    return json.loads(text)
