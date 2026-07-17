"""Safe technical interview evaluation without executing arbitrary user code."""
from __future__ import annotations

import ast
import json
import re
import sqlite3
from typing import Any

from services.llm import EVAL_PARAMS, chat_json


def analyze_python_code(content: str) -> dict:
    try:
        tree = ast.parse(content)
    except SyntaxError as exc:
        return {"valid": False, "syntax_error": f"line {exc.lineno}: {exc.msg}", "score": 0}
    functions = [node for node in ast.walk(tree) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))]
    branches = sum(isinstance(node, (ast.If, ast.For, ast.While, ast.Try, ast.Match, ast.comprehension)) for node in ast.walk(tree))
    loop_nodes = [node for node in ast.walk(tree) if isinstance(node, (ast.For, ast.While, ast.AsyncFor, ast.comprehension))]
    max_loop_depth = 0
    def visit_depth(node: ast.AST, depth: int = 0) -> None:
        nonlocal max_loop_depth
        next_depth = depth + 1 if isinstance(node, (ast.For, ast.While, ast.AsyncFor, ast.comprehension)) else depth
        max_loop_depth = max(max_loop_depth, next_depth)
        for child in ast.iter_child_nodes(node):
            visit_depth(child, next_depth)
    visit_depth(tree)
    complexity_hint = "O(1)" if not loop_nodes else "O(n)" if max_loop_depth == 1 else f"O(n^{max_loop_depth})"
    docstrings = sum(bool(ast.get_docstring(node)) for node in [tree, *functions])
    unsafe = [node.func.id for node in ast.walk(tree) if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in {"eval", "exec", "compile", "__import__"}]
    score = 55 + min(15, len(functions) * 4) + min(15, docstrings * 3) - min(25, len(unsafe) * 10)
    return {
        "valid": True,
        "function_count": len(functions),
        "branch_count": branches,
        "loop_count": len(loop_nodes),
        "max_loop_depth": max_loop_depth,
        "complexity_hint": complexity_hint,
        "documented_blocks": docstrings,
        "unsafe_calls": unsafe,
        "score": max(0, min(100, score)),
        "note": "静态分析不会在服务器执行候选人代码",
    }


def execute_readonly_sql(content: str) -> dict:
    normalized = content.strip()
    if not re.match(r"^(SELECT|WITH)\b", normalized, flags=re.IGNORECASE):
        return {"valid": False, "error": "只允许 SELECT 或 WITH 查询", "score": 0}
    if re.search(r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|ATTACH|DETACH|PRAGMA|CREATE|REPLACE)\b", normalized, flags=re.IGNORECASE):
        return {"valid": False, "error": "检测到非只读 SQL", "score": 0}
    if normalized.count(";") > 1 or (";" in normalized[:-1]):
        return {"valid": False, "error": "只允许一条查询", "score": 0}
    connection = sqlite3.connect(":memory:")
    try:
        connection.executescript("""
        CREATE TABLE users(id INTEGER PRIMARY KEY, name TEXT, department TEXT);
        CREATE TABLE orders(id INTEGER PRIMARY KEY, user_id INTEGER, amount REAL, status TEXT, created_at TEXT);
        INSERT INTO users VALUES (1,'张三','产品'),(2,'李四','技术'),(3,'王五','运营');
        INSERT INTO orders VALUES
          (1,1,199.0,'paid','2026-07-01'),(2,1,99.0,'refunded','2026-07-02'),
          (3,2,499.0,'paid','2026-07-03'),(4,3,129.0,'paid','2026-07-04');
        """)
        cursor = connection.execute(normalized)
        columns = [item[0] for item in cursor.description or []]
        rows = cursor.fetchmany(100)
        return {"valid": True, "columns": columns, "rows": rows, "row_count": len(rows), "score": min(100, 70 + len(columns) * 3)}
    except sqlite3.Error as exc:
        return {"valid": False, "error": str(exc), "score": 20}
    finally:
        connection.close()


def analyze_whiteboard(content: str) -> dict:
    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        return {"valid": False, "error": "白板内容必须是 JSON", "score": 0}
    nodes = data.get("nodes") if isinstance(data, dict) and isinstance(data.get("nodes"), list) else []
    edges = data.get("edges") if isinstance(data, dict) and isinstance(data.get("edges"), list) else []
    node_types = [str(node.get("type") or "component") for node in nodes if isinstance(node, dict)]
    considerations = data.get("considerations") if isinstance(data, dict) and isinstance(data.get("considerations"), list) else []
    score = min(100, 35 + len(nodes) * 5 + len(edges) * 3 + len(considerations) * 5)
    return {"valid": True, "node_count": len(nodes), "edge_count": len(edges), "node_types": node_types, "considerations": considerations, "score": score}


async def enhance_technical_feedback(kind: str, prompt: str, content: str, base_result: dict, rubric: list | None = None) -> dict:
    request = f"""你是技术面试官。请基于静态结果评价候选人提交，不要声称运行了未运行的代码。
类型：{kind}
题目：{prompt}
提交：{content[:8000]}
基础分析：{json.dumps(base_result, ensure_ascii=False)}
评分标准：{json.dumps(rubric or [], ensure_ascii=False)}
输出 JSON：{{"score":0-100,"strengths":[],"weaknesses":[],"suggestions":[],"evidence":[]}}"""
    try:
        feedback = await chat_json([{"role": "user", "content": request}], EVAL_PARAMS)
        score = int(max(0, min(100, float(feedback.get("score", base_result.get("score", 0))))))
        return {**base_result, "score": score, "ai_feedback": feedback}
    except Exception:
        return base_result
