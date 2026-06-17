"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, TrendingUp, Lightbulb, XCircle, Brain, Download } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useFetch } from "@/lib/hooks";
import { fetchAPI } from "@/lib/api";
import { useToast } from "@/components/Toast";
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
  const { data: report, loading } = useFetch<InterviewReport>(`/interview/${uuid}/report`, [uuid]);
  const [tab, setTab] = useState<"report" | "replay">("report");
  const shareRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

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
        {/* 总分 — 可截图区域 */}
        <div ref={shareRef} className="text-center space-y-2 bg-background p-6 rounded-xl">
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

        {/* Tab 切换 */}
        <div className="flex rounded-lg bg-secondary p-1">
          <button
            onClick={() => setTab("report")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${tab === "report" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            分析报告
          </button>
          <button
            onClick={() => setTab("replay")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${tab === "replay" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            对话回放
          </button>
        </div>

        {tab === "replay" ? (
          /* 对话回放 */
          <div className="space-y-4">
            {report.rounds.map((r) => (
              <div key={r.round} className="space-y-3">
                {/* AI 提问 */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    <Brain className="w-4 h-4 text-primary" />
                  </div>
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3 max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">{r.question}</p>
                  </div>
                </div>
                {/* 用户回答 */}
                <div className="flex items-start gap-3 justify-end">
                  <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-3 max-w-[80%]">
                    <p className="text-sm whitespace-pre-wrap">{r.answer || "(跳过)"}</p>
                  </div>
                </div>
                {/* 得分标签 */}
                <div className="flex justify-end">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.score >= 7 ? "bg-success/10 text-success" : r.score >= 5 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                    {r.score}/10
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
        <>

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
                  {r.evaluation?.strengths?.length > 0 && (
                    <p className="text-success flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5 shrink-0" /> {r.evaluation.strengths.join("；")}
                    </p>
                  )}
                  {r.evaluation?.weaknesses?.length > 0 && (
                    <p className="text-destructive flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 shrink-0" /> {r.evaluation.weaknesses.join("；")}
                    </p>
                  )}
                  {r.evaluation?.suggestion && (
                    <p className="mt-1 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 text-primary" /> {r.evaluation.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </details>
          ))}
        </div>
        </>
        )}

        {/* 底部操作 */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link
            href="/interview/setup"
            className="flex-1 rounded-full bg-primary py-3 text-center text-primary-foreground font-medium hover:bg-primary-hover transition-colors"
          >
            再来一次
          </Link>
          <button
            onClick={async () => {
              try {
                // 优先用后端生成分享图
                const data = await fetchAPI<{ image_url: string; share_id: number }>("/share/generate-image", {
                  method: "POST",
                  body: JSON.stringify({ session_uuid: uuid, template: "radar" }),
                });
                // 记录分享行为
                await fetchAPI("/share/record", {
                  method: "POST",
                  body: JSON.stringify({ share_id: data.share_id, channel: "download" }),
                }).catch(() => {});
                // 下载
                const link = document.createElement("a");
                link.download = `probe-report-${uuid}.png`;
                link.href = data.image_url;
                link.click();
                toast.success("图片已保存");
              } catch {
                // Fallback: 前端截图
                if (!shareRef.current) { toast.error("保存图片失败"); return; }
                try {
                  const html2canvas = (await import("html2canvas")).default;
                  const canvas = await html2canvas(shareRef.current, { scale: 2 });
                  const link = document.createElement("a");
                  link.download = `probe-report-${uuid}.png`;
                  link.href = canvas.toDataURL();
                  link.click();
                  toast.success("图片已保存");
                } catch {
                  toast.error("保存图片失败");
                }
              }
            }}
            className="flex-1 rounded-full border border-border py-3 font-medium hover:bg-secondary transition-colors inline-flex items-center justify-center gap-1.5"
          >
            <Download className="w-4 h-4" /> 保存图片
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