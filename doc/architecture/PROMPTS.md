# Prompt 工程

## Prompt 结构约定

每个子智能体的 System Prompt 遵循统一结构：

```
[角色定义]  — 你是谁、职责边界
[输入格式]  — 你将收到什么数据
[输出格式]  — 必须返回什么结构（JSON Schema）
[约束规则]  — 不能做什么、边界条件
[示例]      — 1-2 个 Few-shot
```

---

## 各子智能体

### 规划器 (Planner)

- **输入**: JD + 行业 + 岗位 + 难度 + 用户历史短板
- **输出**: 面试大纲 JSON（题型分布、难度递进、预估时间）
- **约束**: 总题数 8-12，必须覆盖至少 2 种题型

### 追问器 (Prober)

- **输入**: 原始问题 + 用户回答 + 评估器初步评分
- **输出**: 追问问题 or "无需追问"
- **约束**: 最多追问 2 层，回答已完善则不追问

### 评估器 (Evaluator)

- **输入**: 问题 + 回答 + 参考答案(可选) + 评分标准
- **输出**: `{ score: 0-10, strengths: [], weaknesses: [], suggestion: "" }`
- **约束**: 必须给出具体理由，禁止空泛评价

### 报告生成器 (Reporter)

- **输入**: 所有轮次的评估结果 + 用户画像
- **输出**: 总分 + 各维度得分 + 逐题点评 + 改进建议
- **约束**: 语言积极正向，指出问题但给可执行改进方案

---

## LLM 调用参数

```python
# 面试对话 — 需要创造性和人性化
CHAT_PARAMS = {
    "model": "deepseek-chat",
    "temperature": 0.7,
    "max_tokens": 1024,
    "stream": True
}

# 评估/打分 — 需要稳定一致
EVAL_PARAMS = {
    "model": "deepseek-chat",
    "temperature": 0.2,
    "max_tokens": 512,
    "stream": False
}

# 规划 — 需要结构化输出
PLAN_PARAMS = {
    "model": "deepseek-chat",
    "temperature": 0.3,
    "max_tokens": 1024,
    "response_format": {"type": "json_object"},
    "stream": False
}
```

---

## Prompt 注入防护

```python
# 用户输入永远在 User Message 中，不拼入 System Prompt
# 评估器独立调用，不受用户输入干扰
messages = [
    {"role": "system", "content": EVALUATOR_PROMPT},
    {"role": "user", "content": f"问题：{question}\n回答：{user_answer}"}
]
```
