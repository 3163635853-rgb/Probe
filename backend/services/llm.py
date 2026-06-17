import asyncio
import json
import logging
from typing import AsyncGenerator
from openai import AsyncOpenAI
from config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY or "sk-placeholder",
    base_url=settings.DEEPSEEK_BASE_URL,
    timeout=30.0,
)

# LLM 调用参数预设
CHAT_PARAMS = {"model": settings.DEEPSEEK_MODEL, "temperature": 0.7, "max_tokens": 1024}
EVAL_PARAMS = {"model": settings.DEEPSEEK_MODEL, "temperature": 0.2, "max_tokens": 512}
PLAN_PARAMS = {"model": settings.DEEPSEEK_MODEL, "temperature": 0.3, "max_tokens": 1024, "response_format": {"type": "json_object"}}

# Token 计数（进程级累计）
_token_usage = {"prompt_tokens": 0, "completion_tokens": 0, "total_calls": 0}


def get_token_usage() -> dict:
    return _token_usage.copy()


def _record_usage(response):
    if hasattr(response, "usage") and response.usage:
        _token_usage["prompt_tokens"] += response.usage.prompt_tokens or 0
        _token_usage["completion_tokens"] += response.usage.completion_tokens or 0
        _token_usage["total_calls"] += 1
        logger.debug(f"LLM tokens: +{response.usage.prompt_tokens}p/{response.usage.completion_tokens}c")


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
            _token_usage["total_calls"] += 1
            return
        except Exception as e:
            if attempt == 0:
                logger.warning(f"LLM stream_chat retry after error: {e}")
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
            _record_usage(response)
            return response.choices[0].message.content or ""
        except Exception as e:
            if attempt == 0:
                logger.warning(f"LLM chat retry after error: {e}")
                await asyncio.sleep(2)
            else:
                raise


async def chat_json(messages: list[dict], params: dict | None = None) -> dict:
    """强制 JSON 输出，返回解析后的 dict"""
    p = {**PLAN_PARAMS, **(params or {})}
    text = await chat(messages, p)
    text = text.strip()
    # 剥离 markdown code fence (```json ... ``` 或 ``` ... ```)
    if text.startswith("```"):
        lines = text.split("\n")
        # 去首行 (```json 或 ```)
        lines = lines[1:]
        # 去尾行如果是 ``` (允许尾部空白)
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines)
    return json.loads(text)
