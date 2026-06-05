"""FAISS 向量检索 — Phase 1 用 IndexFlatIP + JSON metadata"""
import json
import numpy as np
import faiss
from pathlib import Path
from dataclasses import dataclass
from typing import Optional

DATA_DIR = Path(__file__).parent.parent / "data" / "faiss"


@dataclass
class QuestionResult:
    id: int
    question: str
    score: float
    question_type: str
    difficulty: int
    industry_id: int
    position_id: int | None


class FAISSRetriever:
    def __init__(self, dim: int = 1024):
        self.dim = dim
        self.index: Optional[faiss.IndexFlatIP] = None
        self.metadata: list[dict] = []

    def build_index(self, vectors: list[list[float]], metadata: list[dict]):
        """从向量和元数据构建索引"""
        arr = np.array(vectors, dtype=np.float32)
        # L2 normalize for cosine similarity via inner product
        faiss.normalize_L2(arr)
        self.index = faiss.IndexFlatIP(self.dim)
        self.index.add(arr)
        self.metadata = metadata

    def search(
        self,
        query_vector: list[float],
        top_k: int = 10,
        industry_id: int | None = None,
        position_id: int | None = None,
        difficulty: int | None = None,
        exclude_ids: set[int] | None = None,
    ) -> list[QuestionResult]:
        """向量检索 + 标量过滤"""
        if self.index is None or self.index.ntotal == 0:
            return []

        # 多取一些用于过滤后截断
        search_k = min(top_k * 5, self.index.ntotal)
        query = np.array([query_vector], dtype=np.float32)
        faiss.normalize_L2(query)
        scores, indices = self.index.search(query, search_k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < 0:
                continue
            meta = self.metadata[idx]
            qid = meta["id"]

            # 过滤
            if exclude_ids and qid in exclude_ids:
                continue
            if industry_id and meta.get("industry_id") != industry_id:
                continue
            if position_id and meta.get("position_id") != position_id:
                continue
            if difficulty and abs(meta.get("difficulty", 3) - difficulty) > 1:
                continue

            results.append(QuestionResult(
                id=qid,
                question=meta.get("question", ""),
                score=float(score),
                question_type=meta.get("question_type", "tech"),
                difficulty=meta.get("difficulty", 3),
                industry_id=meta.get("industry_id", 0),
                position_id=meta.get("position_id"),
            ))
            if len(results) >= top_k:
                break

        return results

    def save(self, name: str = "knowledge"):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        if self.index:
            faiss.write_index(self.index, str(DATA_DIR / f"{name}.index"))
        with open(DATA_DIR / f"{name}.meta.json", "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False)

    def load(self, name: str = "knowledge") -> bool:
        index_path = DATA_DIR / f"{name}.index"
        meta_path = DATA_DIR / f"{name}.meta.json"
        if not index_path.exists() or not meta_path.exists():
            return False
        self.index = faiss.read_index(str(index_path))
        with open(meta_path, "r", encoding="utf-8") as f:
            self.metadata = json.load(f)
        return True


# 全局实例
retriever = FAISSRetriever()
# 启动时尝试加载
retriever.load()
