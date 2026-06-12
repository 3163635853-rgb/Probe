"use client";

import { Check, Bell } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useFetch } from "@/lib/hooks";
import { fetchAPI } from "@/lib/api";
import { useState } from "react";
import type { PaginatedData } from "@/lib/types";

interface Notification {
  id: number;
  title: string;
  type: string;
  is_read: boolean;
  related_url: string | null;
  created_at: string;
}

export default function NotificationsPage() {
  return (
    <AuthGuard>
      <NotificationsContent />
    </AuthGuard>
  );
}

function NotificationsContent() {
  const { data, loading, refetch } = useFetch<PaginatedData<Notification>>("/notification/list?page=1&page_size=50");
  const [optimistic, setOptimistic] = useState<Set<number>>(new Set());

  const items = data?.items || [];

  async function markRead(id: number) {
    setOptimistic((s) => new Set(s).add(id));
    try {
      await fetchAPI(`/notification/${id}/read`, { method: "PUT" });
    } catch {}
  }

  async function markAllRead() {
    setOptimistic(new Set(items.map((n) => n.id)));
    try {
      await fetchAPI("/notification/read-all", { method: "PUT" });
    } catch {}
  }

  const isRead = (n: Notification) => n.is_read || optimistic.has(n.id);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">通知</h1>
          {items.some((n) => !isRead(n)) && (
            <button onClick={markAllRead} className="text-sm text-primary hover:underline">
              全部已读
            </button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="mt-3 text-muted-foreground">暂无通知</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <div
                key={n.id}
                onClick={() => { if (!isRead(n)) markRead(n.id); }}
                className={`rounded-lg border border-border p-4 cursor-pointer transition-colors ${isRead(n) ? "bg-card opacity-70" : "bg-card hover:bg-secondary"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm ${isRead(n) ? "" : "font-medium"}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  {!isRead(n) && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />}
                  {isRead(n) && <Check className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
