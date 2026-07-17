"use client";

import { useState } from "react";
import { Headphones, Loader2, Repeat2, Sparkles, TrendingUp } from "lucide-react";
import { fetchAPI, getErrorMessage } from "@/lib/api";
import type { RoundDetail } from "@/lib/types";
import { useToast } from "@/components/Toast";

type RetryResult = {
  score: number;
  attempt_no: number;
  evaluation: RoundDetail["evaluation"];
  optimized_answers: { structured: string; concise: string; star: string; outline: string[]; fact_warnings: string[] };
  comparison: { score_before: number; score_after: number; score_delta: number; added_quantification: number; new_key_phrases: string[]; resolved_weaknesses: string[] };
};

export function RetryRound({ round }: { round: RoundDetail }) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState(round.answer || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RetryResult | null>(null);

  async function retry() {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const data = await fetchAPI<RetryResult>(`/practice/rounds/${round.round_id}/retry`, { method: "POST", body: JSON.stringify({ answer }) });
      setResult(data);
      toast.success(`重答完成，得分提升 ${data.comparison.score_delta} 分`);
    } catch (error) {
      toast.error(getErrorMessage(error, "重答评估失败"));
    } finally {
      setLoading(false);
    }
  }

  function speak() {
    const text = result?.optimized_answers.concise || result?.optimized_answers.structured;
    if (!text || !("speechSynthesis" in window)) {
      toast.warning("请先完成一次重答");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  return <div className="mt-4 border-t border-border pt-4">
    <div className="flex flex-wrap gap-2">
      <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"><Repeat2 className="h-3.5 w-3.5" />立即重答</button>
      <button onClick={() => { setOpen(true); setAnswer(""); }} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"><Sparkles className="h-3.5 w-3.5 text-primary" />只练这个弱点</button>
      <button onClick={speak} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-secondary"><Headphones className="h-3.5 w-3.5" />听优秀示范</button>
    </div>
    {open && <div className="mt-4 rounded-xl bg-secondary/60 p-4">
      <p className="text-xs font-semibold text-muted-foreground">根据点评重新组织答案</p>
      <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} className="mt-2 w-full rounded-xl border border-input bg-card px-3 py-2.5 text-sm leading-6" placeholder="这次补上量化结果、完整 STAR 或更清楚的结论…" />
      <button onClick={retry} disabled={loading || !answer.trim()} className="mt-2 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">{loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{loading ? "评估中" : "提交重答"}</button>
      {result && <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3 rounded-xl bg-card p-3"><span className="text-2xl font-bold text-muted-foreground">{result.comparison.score_before}</span><TrendingUp className="h-5 w-5 text-success" /><span className="text-3xl font-bold text-success">{result.comparison.score_after}</span><span className="rounded-full bg-success/10 px-2 py-1 text-xs font-semibold text-success">+{result.comparison.score_delta}</span></div>
        <div className="grid gap-2 sm:grid-cols-2"><Compare label="新增量化" value={`${result.comparison.added_quantification} 处`} /><Compare label="新关键表达" value={result.comparison.new_key_phrases.slice(0, 4).join("、") || "结构更清晰"} /></div>
        <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs font-semibold text-primary">AI 保留事实后的 60 秒版本</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{result.optimized_answers.concise}</p></div>
        {result.evaluation.evidence?.length ? <div className="rounded-xl border border-border bg-card p-3"><p className="text-xs font-semibold">本次评分证据</p><div className="mt-2 space-y-2">{result.evaluation.evidence.map((item, index) => <p key={index} className={`text-xs ${item.type === "strength" ? "text-success" : "text-destructive"}`}><strong>“{item.quote}”</strong> — {item.reason}</p>)}</div></div> : null}
      </div>}
    </div>}
  </div>;
}

function Compare({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-card p-3"><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div>;
}
