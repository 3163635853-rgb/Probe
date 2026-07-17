"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Clock3, Loader2, Sparkles, Target } from "lucide-react";
import { fetchAPI, getErrorMessage } from "@/lib/api";
import { useFetch } from "@/lib/hooks";
import { useToast } from "@/components/Toast";

type Drill = { code: string; name: string; duration_min: number; dimension: string; prompt: string; question?: string };
type Optimized = { structured: string; concise: string; star: string; outline: string[]; fact_warnings: string[] };

export function PracticePanel() {
  const toast = useToast();
  const { data: drills, loading } = useFetch<Drill[]>("/practice/drills");
  const [selected, setSelected] = useState<Drill | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [position, setPosition] = useState("");
  const [company, setCompany] = useState("");
  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [result, setResult] = useState<Optimized | null>(null);
  const answerStats = useMemo(() => ({ chars: answer.trim().length, seconds: Math.max(0, Math.round(answer.trim().length / 4.2)) }), [answer]);

  async function chooseDrill(drill: Drill) {
    setSelected(drill);
    setQuestion(drill.prompt);
    setAnswer("");
    setResult(null);
  }

  async function generate() {
    if (!selected) return;
    setGenerating(true);
    try {
      const data = await fetchAPI<Drill>(`/practice/drills/${selected.code}/generate`, {
        method: "POST",
        body: JSON.stringify({ position, company_name: company, difficulty: 3, focus: selected.dimension }),
      });
      setQuestion(data.question || data.prompt);
      setResult(null);
    } catch (error) {
      toast.error(getErrorMessage(error, "生成训练题失败"));
    } finally {
      setGenerating(false);
    }
  }

  async function optimize() {
    if (!question.trim() || !answer.trim()) return;
    setOptimizing(true);
    try {
      const data = await fetchAPI<Optimized>("/practice/optimize", {
        method: "POST",
        body: JSON.stringify({ question, answer, evaluation: { suggestion: `围绕${selected?.dimension || "岗位匹配"}增强结构，并保留全部真实事实` } }),
      });
      setResult(data);
      toast.success("已生成三个不虚构事实的回答版本");
    } catch (error) {
      toast.error(getErrorMessage(error, "答案优化失败"));
    } finally {
      setOptimizing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">3–8 分钟专项训练</h2></div>
        <p className="mt-1 text-sm text-muted-foreground">不必每次完成整场面试。选择一个弱项，只练到表达更清楚。</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {loading && <p className="text-sm text-muted-foreground">加载训练卡…</p>}
          {drills?.map((drill) => (
            <button key={drill.code} onClick={() => chooseDrill(drill)} className={`rounded-xl border p-3 text-left transition-all ${selected?.code === drill.code ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:-translate-y-0.5 hover:border-primary/30"}`}>
              <div className="flex items-start justify-between gap-2"><strong className="text-sm">{drill.name}</strong><span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Clock3 className="h-3 w-3" />{drill.duration_min} 分钟</span></div>
              <p className="mt-2 text-xs text-muted-foreground">训练 {drill.dimension}</p>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Active drill · {selected.name}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label><span className="mb-1 block text-xs font-semibold text-muted-foreground">目标岗位</span><input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="产品经理" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-semibold text-muted-foreground">目标公司</span><input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="可选" className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" /></label>
            </div>
            <button onClick={generate} disabled={generating} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary disabled:opacity-60">{generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}生成定制题</button>
            <div className="mt-5 rounded-xl bg-secondary p-4"><p className="text-xs font-semibold text-muted-foreground">面试题</p><p className="mt-2 leading-7">{question}</p></div>
            <label className="mt-4 block"><span className="mb-1 flex items-center justify-between text-xs font-semibold text-muted-foreground"><span>你的回答</span><span>{answerStats.chars} 字 · 约 {answerStats.seconds} 秒</span></span><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={10} placeholder="先完整回答一次，不要边写边追求完美…" className="w-full resize-y rounded-xl border border-input bg-background px-3 py-3 text-sm leading-6" /></label>
            <button onClick={optimize} disabled={optimizing || !answer.trim()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">{optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}{optimizing ? "分析中" : "生成优化与复练版本"}</button>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold">回答版本台</h2>
            {!result ? <div className="mt-4 rounded-xl border border-dashed border-border p-8 text-center text-sm leading-6 text-muted-foreground">完成一次回答后，这里会给出结构版、60 秒版与 STAR 版。所有版本只使用你已经提供的事实。</div> : (
              <div className="mt-4 space-y-4">
                <Version title="结构优化版" text={result.structured} />
                <Version title="60 秒精简版" text={result.concise} />
                <Version title="STAR 版" text={result.star} />
                <div className="rounded-xl bg-primary/5 p-4"><p className="text-sm font-semibold">复练提纲</p><ol className="mt-2 space-y-1 text-sm text-muted-foreground">{result.outline.map((item, index) => <li key={`${item}-${index}`}>{index + 1}. {item}</li>)}</ol></div>
                {result.fact_warnings.length > 0 && <div className="rounded-xl border border-primary/20 p-4"><p className="text-sm font-semibold text-primary">事实边界提醒</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">{result.fact_warnings.map((item) => <li key={item}>{item}</li>)}</ul></div>}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Version({ title, text }: { title: string; text: string }) {
  return <article className="rounded-xl border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary">{title}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-7">{text}</p></article>;
}
