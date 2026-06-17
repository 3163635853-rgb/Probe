"use client";

import { Receipt } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useFetch } from "@/lib/hooks";
import type { PaginatedData } from "@/lib/types";

interface Order {
  order_uuid: string;
  product_type: string;
  pay_amount: number;
  status: "paid" | "pending" | "failed";
  created_at: string;
  paid_at: string | null;
}

export default function OrdersPage() {
  return (
    <AuthGuard>
      <OrdersContent />
    </AuthGuard>
  );
}

function OrdersContent() {
  const { data, loading } = useFetch<PaginatedData<Order>>("/payment/orders?page=1&page_size=50");
  const items = data?.items || [];

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
        <h1 className="text-2xl font-bold">支付记录</h1>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <Receipt className="w-12 h-12 text-muted-foreground mx-auto" />
            <p className="mt-3 text-muted-foreground">暂无支付记录</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((order) => (
              <div key={order.order_uuid} className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {order.product_type === "monthly" ? "月卡" : order.product_type === "yearly" ? "年卡" : "单次"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">¥{order.pay_amount}</p>
                  <p className={`text-xs mt-0.5 ${order.status === "paid" ? "text-success" : order.status === "pending" ? "text-primary" : "text-destructive"}`}>
                    {order.status === "paid" ? "已支付" : order.status === "pending" ? "待支付" : "失败"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
