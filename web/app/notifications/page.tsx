"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { fetchAPI } from "@/lib/api";
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
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAPI<PaginatedData<Notification>>("/notification/list?page=1&page_size=50")
      .then((data) => setItems(data.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function markRead(id: number) {
    await fetchAPI(`/notification/${id}/read`, { method: "PUT" });
    setItems((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  }

  async function markAllRead() {
    await fetchAPI("/notification/read-all", { method: "PUT" });
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

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
          {items.some((n) => !n.is_read) && (
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
                onClick={() => { if (!n.is_read) markRead(n.id); }}
                className={`rounded-lg border border-border p-4 cursor-pointer transition-colors ${n.is_read ? "bg-card opacity-70" : "bg-card hover:bg-secondary"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm ${n.is_read ? "" : "font-medium"}`}>{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  {!n.is_read && <span className="shrink-0 w-2 h-2 rounded-full bg-primary mt-1.5" />}
                  {n.is_read && <Check className="w-4 h-4 text-muted-foreground shrink-0" />}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
