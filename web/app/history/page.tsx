"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, TrendingUp } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { fetchAPI } from "@/lib/api";
import type { InterviewHistoryItem, PaginatedData } from "@/lib/types";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function HistoryPage() {
  return (
    <AuthGuard>
      <HistoryContent />
    </AuthGuard>
  );
}

function HistoryContent() {
  const [items, setItems] = useState<InterviewHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadPage(1);
  }, []);

  async function loadPage(p: number) {
    setLoading(true);
    try {
      const data = await fetchAPI<PaginatedData<InterviewHistoryItem>>(
        `/interview/history?page=${p}&page_size=20`
      );
      setItems((prev) => (p === 1 ? data.items : [...prev, ...data.items]));
      setHasMore(data.has_more);
      setPage(p);
    } finally {
      setLoading(false);
    }
  }

  if (!loading && items.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="text-center space-y-4">
          <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">还没有面试记录</p>
          <Link
            href="/interview/setup"
            className="inline-block rounded-full bg-primary px-6 py-2.5 text-primary-foreground font-medium hover:bg-primary-hover transition-colors"
          >
            开始第一次面试
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">面试记录</h1>

        {/* 趋势图 */}
        <ScoreTrend items={items} />

        <div className="space-y-3">
          {items.map((item) => (
            <Link
              key={item.session_uuid}
              href={`/interview/${item.session_uuid}/report`}
              className="block rounded-lg border border-border bg-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{item.position}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.mode === "tech" ? "技术面" : "综合面"} · {item.total_rounds} 题 · {formatDate(item.started_at)}
                  </p>
                </div>
                <div className="text-right">
                  {item.final_score !== null ? (
                    <p className={`text-2xl font-bold ${item.final_score >= 70 ? "text-success" : "text-primary"}`}>
                      {item.final_score}
                    </p>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {item.status === "ongoing" ? "进行中" : "未完成"}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>

        {hasMore && (
          <button
            onClick={() => loadPage(page + 1)}
            disabled={loading}
            className="w-full rounded-lg border border-border py-3 text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
          >
            {loading ? "加载中..." : "加载更多"}
          </button>
        )}
      </div>
    </main>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function ScoreTrend({ items }: { items: InterviewHistoryItem[] }) {
  const scored = items
    .filter((i) => i.final_score !== null)
    .reverse()
    .map((i) => ({
      date: new Date(i.started_at).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" }),
      score: i.final_score,
    }));

  if (scored.length < 2) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-primary" />
        <span className="text-sm font-medium">成绩趋势</span>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scored}>
            <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
            <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" width={30} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid var(--border)", background: "var(--card)" }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2} dot={{ r: 4, fill: "var(--primary)" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
