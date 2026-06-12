"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useFetch } from "@/lib/hooks";

interface Coupon {
  id: number;
  name: string;
  coupon_type: string;
  value: number;
  status: "unused" | "used" | "expired";
  expire_at: string;
}

export default function CouponsPage() {
  return (
    <AuthGuard>
      <CouponsContent />
    </AuthGuard>
  );
}

function CouponsContent() {
  const [filter, setFilter] = useState<"unused" | "all">("unused");
  const { data: coupons, loading } = useFetch<Coupon[]>(`/coupon/mine?status=${filter}`, [filter]);

  const items = coupons || [];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-2xl px-4 py-8 space-y-4">
        <h1 className="text-2xl font-bold">我的优惠券</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setFilter("unused")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === "unused" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"}`}
          >
            可用
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "border border-border hover:bg-secondary"}`}
          >
            全部
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <Ticket className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="mt-3 text-muted-foreground">暂无优惠券</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((c) => (
              <div
                key={c.id}
                className={`rounded-xl border p-4 flex items-center gap-4 ${c.status === "unused" ? "border-primary/30 bg-card" : "border-border bg-card opacity-60"}`}
              >
                <div className="shrink-0 w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary">
                    {c.coupon_type === "free_days" ? `${c.value}天` : `¥${c.value}`}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">{c.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {c.status === "unused" ? `${new Date(c.expire_at).toLocaleDateString("zh-CN")} 到期` : c.status === "used" ? "已使用" : "已过期"}
                  </p>
                </div>
                {c.status === "unused" && (
                  <span className="shrink-0 text-xs font-medium text-primary">可用</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
