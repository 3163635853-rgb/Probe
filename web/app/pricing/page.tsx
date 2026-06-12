"use client";

import { Check, Crown } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useFetch } from "@/lib/hooks";
import { fetchAPI } from "@/lib/api";
import { useToast } from "@/components/Toast";

interface Plan {
  product_type: string;
  name: string;
  price: number;
  original_price: number;
  description: string;
}

export default function PricingPage() {
  return (
    <AuthGuard>
      <PricingContent />
    </AuthGuard>
  );
}

function PricingContent() {
  const { data: plans, loading } = useFetch<Plan[]>("/payment/plans");
  const toast = useToast();

  async function handlePurchase(productType: string) {
    try {
      const data = await fetchAPI<{ order_uuid: string; wx_pay_params: any }>("/payment/create", {
        method: "POST",
        body: JSON.stringify({ product_type: productType }),
      });
      if (data.wx_pay_params && typeof WeixinJSBridge !== "undefined") {
        WeixinJSBridge.invoke("getBrandWCPayRequest", data.wx_pay_params, (res: any) => {
          if (res.err_msg === "get_brand_wcpay_request:ok") {
            toast.success("支付成功");
            window.location.reload();
          }
        });
      } else {
        toast.info("请在微信中完成支付");
      }
    } catch (e: any) {
      toast.error(e.message || "创建订单失败");
    }
  }

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  const items = plans || [];

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-12 space-y-8">
        <div className="text-center">
          <Crown className="w-10 h-10 text-primary mx-auto" />
          <h1 className="mt-4 text-3xl font-bold">升级套餐</h1>
          <p className="mt-2 text-muted-foreground">解锁无限面试，成为面试达人</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {items.map((plan) => {
            const isPopular = plan.product_type === "monthly";
            return (
              <div
                key={plan.product_type}
                className={`relative rounded-2xl border p-6 space-y-4 ${isPopular ? "border-primary shadow-lg shadow-primary/10" : "border-border"}`}
              >
                {isPopular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    推荐
                  </span>
                )}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">¥{plan.price}</span>
                  {plan.original_price > plan.price && (
                    <span className="text-sm text-muted-foreground line-through">¥{plan.original_price}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 无限面试次数</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 完整面试报告</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-success" /> 历史记录保留</li>
                </ul>
                <button
                  onClick={() => handlePurchase(plan.product_type)}
                  className={`w-full rounded-full py-3 font-medium transition-colors ${isPopular ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "border border-border hover:bg-secondary"}`}
                >
                  选择{plan.name}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

declare global {
  interface Window { WeixinJSBridge: any; }
  const WeixinJSBridge: any;
}
