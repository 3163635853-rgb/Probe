"""导入种子题到 MySQL + 构建 FAISS 索引"""
import asyncio
import json
from pathlib import Path
from sqlalchemy import select

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from db.mysql import AsyncSessionLocal
from models.knowledge import KnowledgeQuestion
from knowledge.embedder import embed_batch
from knowledge.retriever import FAISSRetriever

DATA_FILE = Path(__file__).parent.parent / "data" / "seed_questions.json"


async def import_questions():
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        questions = json.load(f)

    async with AsyncSessionLocal() as db:
        # Check if already imported
        result = await db.execute(select(KnowledgeQuestion).limit(1))
        if result.scalar_one_or_none():
            print("Questions already imported, skipping DB insert.")
        else:
            for q in questions:
                kq = KnowledgeQuestion(
                    industry_id=q["industry_id"],
                    position_id=q.get("position_id"),
                    question_type=q["question_type"],
                    question=q["question"],
                    reference_answer=q.get("reference_answer"),
                    scoring_criteria=q.get("scoring_criteria"),
                    difficulty=q.get("difficulty", 3),
                    tags=q.get("tags"),
                    source="manual",
                )
                db.add(kq)
            await db.commit()
            print(f"Imported {len(questions)} questions to MySQL.")

    # Build FAISS index
    print("Building FAISS index...")
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(KnowledgeQuestion).where(KnowledgeQuestion.status == "active"))
        all_questions = result.scalars().all()

    texts = [q.question for q in all_questions]
    print(f"Embedding {len(texts)} questions...")

    try:
        vectors = await embed_batch(texts)
    except Exception as e:
        print(f"Embedding failed: {e}")
        print("Skipping FAISS index build. You can retry after configuring embedding API.")
        return

    metadata = [
        {
            "id": q.id,
            "question": q.question,
            "industry_id": q.industry_id,
            "position_id": q.position_id,
            "question_type": q.question_type,
            "difficulty": q.difficulty,
        }
        for q in all_questions
    ]

    if not vectors:
        print("No vectors returned; FAISS index was not built.")
        return
    vector_dim = len(vectors[0])
    if any(len(vector) != vector_dim for vector in vectors):
        raise RuntimeError("Embedding API returned inconsistent vector dimensions")
    retriever = FAISSRetriever(dim=vector_dim)
    retriever.build_index(vectors, metadata)
    retriever.save("knowledge")
    print(f"FAISS index built and saved: {len(texts)} vectors.")


if __name__ == "__main__":
    asyncio.run(import_questions())
