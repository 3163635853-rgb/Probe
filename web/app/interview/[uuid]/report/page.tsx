"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, TrendingUp, Lightbulb, XCircle } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { fetchAPI } from "@/lib/api";
import type { InterviewReport } from "@/lib/types";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";

export default function ReportPage() {
  return (
    <AuthGuard>
      <ReportContent />
    </AuthGuard>
  );
}

function ReportContent() {
  const { uuid } = useParams<{ uuid: string }>();
  const [report, setReport] = useState<InterviewReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI<InterviewReport>(`/interview/${uuid}/report`)
      .then(setReport)
      .finally(() => setLoading(false));
  }, [uuid]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">报告生成中...</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground">报告不存在</p>
      </div>
    );
  }

  const radarData = Object.entries(report.dimensions).map(([name, score]) => ({
    dimension: name,
    score,
    fullMark: 10,
  }));

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
        {/* 总分 */}
        <div className="text-center space-y-2">
          <p className={`text-6xl font-bold ${report.overall_score >= 70 ? "text-success" : "text-primary"}`}>
            {report.overall_score}
          </p>
          <p className="text-muted-foreground">
            {report.position} · {report.mode === "tech" ? "技术面" : "综合面"} · {report.total_rounds} 题
          </p>
          <span
            className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${
              report.overall_score >= 70
                ? "bg-success/10 text-success"
                : "bg-accent text-accent-foreground"
            }`}
          >
            {report.overall_score >= 70 ? "表现优秀" : "待提升"}
          </span>
        </div>

        {/* 雷达图 */}
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis dataKey="dimension" className="text-sm" />
              <PolarRadiusAxis angle={90} domain={[0, 10]} tick={false} />
              <Radar dataKey="score" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.2} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* 维度卡片 */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(report.dimensions).map(([name, score]) => (
            <div key={name} className="rounded-lg border border-border bg-card p-4 text-center shadow-sm">
              <p className="text-2xl font-bold">{score}</p>
              <p className="mt-1 text-sm text-muted-foreground">{name}</p>
            </div>
          ))}
        </div>

        {/* 总结 */}
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm space-y-4">
          <p className="text-sm leading-relaxed">{report.summary}</p>
          {report.strengths.length > 0 && (
            <div>
              <h3 className="font-medium text-success mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" /> 优势
              </h3>
              <ul className="space-y-1 text-sm">
                {report.strengths.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
            </div>
          )}
          {report.improvements.length > 0 && (
            <div>
              <h3 className="font-medium text-primary mb-2 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" /> 改进建议
              </h3>
              <ul className="space-y-1 text-sm">
                {report.improvements.map((s, i) => <li key={i}>· {s}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* 逐题详情 */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">逐题详情</h2>
          {report.rounds.map((r) => (
            <details key={r.round} className="rounded-lg border border-border bg-card shadow-sm">
              <summary className="cursor-pointer px-4 py-3 flex items-center justify-between">
                <span className="text-sm font-medium">第 {r.round} 题</span>
                <span className="text-sm text-muted-foreground">{r.score}/10</span>
              </summary>
              <div className="border-t border-border px-4 py-4 space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">问题</p>
                  <p>{r.question}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">我的回答</p>
                  <p className="whitespace-pre-wrap">{r.answer}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">AI 点评</p>
                  {r.evaluation.strengths.length > 0 && (
                    <p className="text-success flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {r.evaluation.strengths.join("；")}
                    </p>
                  )}
                  {r.evaluation.weaknesses.length > 0 && (
                    <p className="text-destructive flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 shrink-0" /> {r.evaluation.weaknesses.join("；")}
                    </p>
                  )}
                  {r.evaluation.suggestion && (
                    <p className="mt-1 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 text-primary" /> {r.evaluation.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>

        {/* 底部操作 */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/interview/setup"
            className="flex-1 rounded-full bg-primary py-3 text-center text-primary-foreground font-medium hover:bg-primary-hover transition-colors"
          >
            再来一次
          </Link>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href); }}
            className="flex-1 rounded-full border border-border py-3 font-medium hover:bg-secondary transition-colors"
          >
            复制链接
          </button>
          <Link
            href="/history"
            className="flex-1 rounded-full border border-border py-3 text-center font-medium hover:bg-secondary transition-colors"
          >
            历史记录
          </Link>
        </div>
      </div>
    </main>
  );
}