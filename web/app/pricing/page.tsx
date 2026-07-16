"use client";

import { useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useFetch } from "@/lib/hooks";
import { fetchAPI, getErrorMessage } from "@/lib/api";
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


interface CouponOption {
  id: number;
  name: string;
  coupon_type: string;
  value: number;
  status: string;
  expire_at: string;
}

interface Subscription {
  plan: string;
  status: string;
  expire_at: string;
  auto_renew: boolean;
  days_remaining: number;
}

function PricingContent() {
  const { data: plans, loading } = useFetch<Plan[]>("/payment/plans");
  const { data: sub } = useFetch<Subscription | null>("/subscription/current");
  const { data: coupons } = useFetch<CouponOption[]>("/coupon/mine?status=unused");
  const toast = useToast();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);

  async function handlePurchase(productType: string) {
    if (purchasing) return;
    setPurchasing(productType);
    try {
      const inWechat = /MicroMessenger/i.test(navigator.userAgent);
      const onMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (!inWechat && !onMobile) {
        toast.info("请使用手机浏览器或微信打开本页完成支付");
        return;
      }
      const paymentMethod = inWechat ? "jsapi" : "h5";
      const data = await fetchAPI<{
        order_uuid: string;
        wx_pay_params: WxPayParams | null;
        h5_url: string | null;
      }>("/payment/create", {
        method: "POST",
        body: JSON.stringify({
          product_type: productType,
          payment_method: paymentMethod,
          coupon_id: selectedCouponId || undefined,
        }),
      });
      if (data.wx_pay_params && window.WeixinJSBridge) {
        window.WeixinJSBridge.invoke("getBrandWCPayRequest", data.wx_pay_params, (res: WxPayResult) => {
          if (res.err_msg === "get_brand_wcpay_request:ok") {
            toast.success("支付成功");
            window.location.reload();
          } else if (res.err_msg !== "get_brand_wcpay_request:cancel") {
            toast.error("支付未完成，请重试");
          }
        });
      } else if (data.h5_url) {
        const separator = data.h5_url.includes("?") ? "&" : "?";
        window.location.assign(`${data.h5_url}${separator}redirect_url=${encodeURIComponent(window.location.href)}`);
      } else {
        toast.error("无法调起微信支付");
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "创建订单失败");
    } finally {
      setPurchasing(null);
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

        {/* 当前订阅状态 */}
        {sub && (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex items-center justify-between">
            <div>
              <p className="font-medium">当前套餐：{sub.plan === "monthly" ? "月卡" : sub.plan === "yearly" ? "年卡" : sub.plan}</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {sub.days_remaining > 0 ? `${sub.days_remaining} 天后到期` : "已过期"} · {sub.auto_renew ? "续费提醒已开" : "未开启提醒提醒"}
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetchAPI("/subscription/auto-renew", {
                    method: "PUT",
                    body: JSON.stringify({ auto_renew: !sub.auto_renew }),
                  });
                  toast.success(sub.auto_renew ? "已关闭提醒提醒" : "已开启提醒提醒");
                  window.location.reload();
                } catch (e: unknown) {
                  toast.error(getErrorMessage(e, "操作失败"));
                }
              }}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
            >
              {sub.auto_renew ? "关闭提醒" : "开启提醒"}
            </button>
          </div>
        )}

        {(coupons || []).some((coupon) => coupon.coupon_type === "discount") && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div>
              <p className="font-medium">使用优惠券</p>
              <p className="text-sm text-muted-foreground">优惠金额会在创建微信支付订单时自动核算</p>
            </div>
            <select
              value={selectedCouponId ?? ""}
              onChange={(event) => setSelectedCouponId(event.target.value ? Number(event.target.value) : null)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm"
            >
              <option value="">不使用优惠券</option>
              {(coupons || []).filter((coupon) => coupon.coupon_type === "discount").map((coupon) => (
                <option key={coupon.id} value={coupon.id}>
                  {coupon.name} · 优惠 {coupon.value}%
                </option>
              ))}
            </select>
          </div>
        )}

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
                  disabled={purchasing !== null}
                  className={`w-full rounded-full py-3 font-medium transition-colors ${isPopular ? "bg-primary text-primary-foreground hover:bg-primary-hover" : "border border-border hover:bg-secondary"}`}
                >
                  {purchasing === plan.product_type ? (
                    <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />处理中</span>
                  ) : `选择${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

interface WxPayParams {
  appId: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

interface WxPayResult {
  err_msg: string;
}

interface WeixinJSBridgeInterface {
  invoke(api: string, params: WxPayParams, callback: (res: WxPayResult) => void): void;
}

declare global {
  interface Window { WeixinJSBridge?: WeixinJSBridgeInterface; }
}
