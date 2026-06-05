"""Embedding 服务 — 调用 API 获取文本向量"""
from openai import AsyncOpenAI
from config import settings

_client = AsyncOpenAI(
    api_key=settings.DEEPSEEK_API_KEY or "sk-placeholder",
    base_url=settings.DEEPSEEK_BASE_URL,
)

EMBEDDING_MODEL = "text-embedding-v1"  # 根据实际可用模型调整
EMBEDDING_DIM = 1024


async def embed(text: str) -> list[float]:
    """单文本 embedding"""
    response = await _client.embeddings.create(
        input=[text],
        model=EMBEDDING_MODEL,
    )
    return response.data[0].embedding


async def embed_batch(texts: list[str], batch_size: int = 32) -> list[list[float]]:
    """批量 embedding"""
    results = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        response = await _client.embeddings.create(
            input=batch,
            model=EMBEDDING_MODEL,
        )
        results.extend([d.embedding for d in response.data])
    return results
