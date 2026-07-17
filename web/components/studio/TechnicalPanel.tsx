"use client";

import { useState } from "react";
import { Braces, Database, Loader2, Network, ShieldCheck } from "lucide-react";
import { fetchAPI, getErrorMessage } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useToast } from "@/components/Toast";

type Exercise = { code: string; kind: "code" | "sql" | "whiteboard" | "debug"; title: string; prompt: string; language: string };
type Evaluation = { uuid: string; score: number; result: Record<string, unknown> & { valid?: boolean; error?: string; note?: string; columns?: string[]; rows?: unknown[][]; ai_feedback?: { strengths?: string[]; weaknesses?: string[]; suggestions?: string[]; evidence?: string[] } } };

const STARTERS: Record<string, string> = {
  code: `def summarize_orders(orders):\n    \"\"\"Return paid amount by user.\"\"\"\n    totals = {}\n    for order in orders:\n        if order["status"] == "paid":\n            totals[order["user_id"]] = totals.get(order["user_id"], 0) + order["amount"]\n    return totals`,
  sql: `SELECT u.name, SUM(o.amount) AS paid_total\nFROM users u\nJOIN orders o ON o.user_id = u.id\nWHERE o.status = 'paid'\nGROUP BY u.id, u.name\nORDER BY paid_total DESC;`,
  whiteboard: `{"nodes":[{"id":"client","type":"client"},{"id":"gateway","type":"gateway"},{"id":"agent","type":"service"},{"id":"redis","type":"cache"}],"edges":[["client","gateway"],["gateway","agent"],["agent","redis"]],"considerations":["限流","断线重连","幂等","降级"]}`,
  debug: `1. 先确认影响范围和开始时间，按机房、版本、接口拆分 P99。\n2. 对比发布、流量、依赖和资源指标。\n3. 检查慢查询、连接池和下游超时。\n4. 必要时回滚或降级，并保留现场证据。`,
};

export function TechnicalPanel() {
  const toast = useToast();
  const { data: exercises } = useFetch<Exercise[]>("/technical/exercises");
  const { data: history, refetch } = useFetch<Array<{ uuid: string; kind: string; score: number; created_at: string }>>("/technical/submissions");
  const [selected, setSelected] = useState<Exercise | null>(null);
  const [content, setContent] = useState(STARTERS.code);
  const [running, setRunning] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);

  function selectExercise(exercise: Exercise) {
    setSelected(exercise);
    setContent(STARTERS[exercise.kind] || "");
    setEvaluation(null);
  }

  async function evaluate() {
    if (!selected || !content.trim()) return;
    setRunning(true);
    try {
      const result = await fetchAPI<Evaluation>("/technical/evaluate", { method: "POST", body: JSON.stringify({ kind: selected.kind, prompt: selected.prompt, content, language: selected.language }) });
      setEvaluation(result);
      toast.success("技术面评估完成");
      refetch();
    } catch (error) {
      toast.error(getErrorMessage(error, "评估失败"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Braces className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">技术面实验台</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">代码只做 AST 静态分析；SQL 只允许在隔离内存库执行只读查询；白板用结构化 JSON 描述组件和连接。</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {exercises?.map((exercise) => <button key={exercise.code} onClick={() => selectExercise(exercise)} className={`rounded-xl border p-4 text-left ${selected?.code === exercise.code ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}><div className="flex items-center gap-2">{exercise.kind === "sql" ? <Database className="h-4 w-4 text-primary" /> : exercise.kind === "whiteboard" ? <Network className="h-4 w-4 text-primary" /> : <Braces className="h-4 w-4 text-primary" />}<strong>{exercise.title}</strong></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{exercise.prompt}</p></button>)}
        </div>
      </section>

      {selected && <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary">{selected.kind} · {selected.language}</p><h3 className="mt-1 text-lg font-bold">{selected.title}</h3></div><ShieldCheck className="h-6 w-6 text-success" /></div>
          <p className="mt-3 rounded-xl bg-secondary p-3 text-sm leading-6">{selected.prompt}</p>
          <textarea spellCheck={false} value={content} onChange={(event) => setContent(event.target.value)} rows={selected.kind === "debug" ? 12 : 18} className="mt-4 w-full rounded-xl border border-input bg-stone-950 p-4 font-mono text-[13px] leading-6 text-stone-100" />
          <button onClick={evaluate} disabled={running} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{running && <Loader2 className="h-4 w-4 animate-spin" />}{running ? "评估中" : selected.kind === "sql" ? "安全执行并评估" : "提交评估"}</button>
        </div>

        <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="text-lg font-bold">评估结果</h3>
            {!evaluation ? <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">提交后查看复杂度线索、安全问题、SQL 结果或架构完整性。</p> : <ResultView evaluation={evaluation} />}
          </section>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h3 className="text-sm font-bold">最近提交</h3><div className="mt-3 space-y-2">{history?.slice(0, 6).map((item) => <div key={item.uuid} className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs"><span>{item.kind}</span><strong>{item.score} 分</strong></div>)}</div></section>
        </div>
      </section>}
    </div>
  );
}

function ResultView({ evaluation }: { evaluation: Evaluation }) {
  const result = evaluation.result;
  const feedback = result.ai_feedback;
  return <div className="mt-4 space-y-4"><div className="flex items-end gap-2"><span className="text-5xl font-bold text-primary">{evaluation.score}</span><span className="pb-1 text-sm text-muted-foreground">/ 100</span></div>{result.error && <p className="rounded-xl bg-destructive/5 p-3 text-sm text-destructive">{result.error}</p>}{Array.isArray(result.rows) && <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-left text-xs"><thead className="bg-secondary"><tr>{(result.columns || []).map((column) => <th key={column} className="px-3 py-2">{column}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index} className="border-t border-border">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-3 py-2">{String(cell)}</td>)}</tr>)}</tbody></table></div>}{feedback && <div className="space-y-3 text-sm">{feedback.strengths?.length ? <Feedback title="做得好" items={feedback.strengths} tone="success" /> : null}{feedback.weaknesses?.length ? <Feedback title="风险" items={feedback.weaknesses} tone="destructive" /> : null}{feedback.suggestions?.length ? <Feedback title="下一步" items={feedback.suggestions} tone="primary" /> : null}</div>}<details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-xs font-semibold">查看静态分析详情</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">{JSON.stringify(result, null, 2)}</pre></details></div>;
}

function Feedback({ title, items, tone }: { title: string; items: string[]; tone: "success" | "destructive" | "primary" }) {
  const toneClass = { success: "text-success", destructive: "text-destructive", primary: "text-primary" }[tone];
  return <div><p className={`text-xs font-semibold ${toneClass}`}>{title}</p><ul className="mt-1 list-disc space-y-1 pl-5 text-muted-foreground">{items.map((item) => <li key={item}>{item}</li>)}</ul></div>;
}
