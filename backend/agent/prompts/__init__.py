from pathlib import Path

PROMPTS_DIR = Path(__file__).parent


def _load_prompt(name: str) -> str:
    return (PROMPTS_DIR / f"{name}.txt").read_text(encoding="utf-8")


PLANNER_PROMPT = _load_prompt("planner")
PROBER_PROMPT = _load_prompt("prober")
EVALUATOR_PROMPT = _load_prompt("evaluator")
REPORTER_PROMPT = _load_prompt("reporter")
