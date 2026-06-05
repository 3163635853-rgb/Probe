"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { fetchAPI } from "@/lib/api";
import type { InterviewHistoryItem, PaginatedData } from "@/lib/types";

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
          <p className="text-4xl">📋</p>
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
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold">面试记录</h1>

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
                      {item.status === "in_progress" ? "进行中" : "未完成"}
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
