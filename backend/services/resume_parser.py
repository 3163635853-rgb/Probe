"""Resume text extraction and deterministic career profile parsing."""
from __future__ import annotations

import io
import re
from collections import Counter
from pathlib import Path

from docx import Document
from pypdf import PdfReader

SUPPORTED_RESUME_TYPES = {"pdf", "docx", "txt", "md"}
SKILL_KEYWORDS = [
    "Python", "Java", "JavaScript", "TypeScript", "React", "Vue", "Next.js", "FastAPI",
    "Spring", "MySQL", "PostgreSQL", "Redis", "Kafka", "Docker", "Kubernetes", "AWS",
    "产品规划", "用户研究", "数据分析", "增长", "运营", "销售", "项目管理", "团队管理",
]
METRIC_RE = re.compile(r"(?:提升|增长|降低|减少|节省|达到|完成|负责).{0,40}?(?:\d+(?:\.\d+)?%?|[一二三四五六七八九十百千万]+(?:万|亿)?)")
YEAR_RE = re.compile(r"(?:19|20)\d{2}(?:[./年-]\d{1,2})?")


def extract_resume_text(content: bytes, extension: str) -> str:
    extension = extension.lower().lstrip(".")
    if extension == "pdf":
        reader = PdfReader(io.BytesIO(content))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    if extension == "docx":
        document = Document(io.BytesIO(content))
        paragraphs = [paragraph.text for paragraph in document.paragraphs]
        for table in document.tables:
            for row in table.rows:
                paragraphs.append(" | ".join(cell.text for cell in row.cells))
        return "\n".join(paragraphs)
    if extension in {"txt", "md"}:
        for encoding in ("utf-8", "gb18030"):
            try:
                return content.decode(encoding)
            except UnicodeDecodeError:
                continue
    raise ValueError("无法解析该简历格式")


def parse_resume_text(text: str) -> dict:
    normalized = re.sub(r"\r\n?", "\n", text)
    lines = [re.sub(r"\s+", " ", line).strip() for line in normalized.splitlines()]
    lines = [line for line in lines if line]
    skills = [keyword for keyword in SKILL_KEYWORDS if keyword.lower() in normalized.lower()]
    metric_lines = [line for line in lines if METRIC_RE.search(line)][:12]
    dated_lines = [line for line in lines if YEAR_RE.search(line)][:20]
    section_names = []
    for line in lines:
        compact = line.replace(" ", "")
        if len(compact) <= 12 and any(key in compact for key in ("教育", "经历", "项目", "技能", "证书", "自我评价", "工作")):
            section_names.append(line)
    return {
        "headline": lines[0][:120] if lines else "",
        "skills": skills,
        "quantified_achievements": metric_lines,
        "timeline_hints": dated_lines,
        "sections": list(dict.fromkeys(section_names))[:12],
        "word_count": len(re.findall(r"[\w\u4e00-\u9fff]+", normalized)),
        "completeness": {
            "has_skills": bool(skills),
            "has_metrics": bool(metric_lines),
            "has_timeline": bool(dated_lines),
            "score": sum((bool(skills), bool(metric_lines), bool(dated_lines))) * 30 + min(10, len(lines) // 5),
        },
    }


def stories_from_resume(parsed: dict, source_resume_id: int | None = None) -> list[dict]:
    stories = []
    for index, achievement in enumerate(parsed.get("quantified_achievements") or []):
        stories.append({
            "title": f"量化成果 {index + 1}",
            "situation": "来自简历的项目或工作经历",
            "task": "明确当时承担的目标和责任",
            "action": achievement,
            "result": achievement,
            "tags": ["量化成果"],
            "metrics": {"source": "resume", "source_resume_id": source_resume_id},
        })
    return stories[:8]
