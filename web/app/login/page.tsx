"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { fetchAPI } from "@/lib/api";
import type { LoginResponse } from "@/lib/types";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  async function handleMockLogin() {
    setLoading(true);
    setError("");
    try {
      const data = await fetchAPI<LoginResponse>("/auth/wechat", {
        method: "POST",
        body: JSON.stringify({ code: "mock_code" }),
      });
      login(data.token, data.user);
      router.replace("/interview/setup");
    } catch (e: any) {
      setError(e.message || "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Probe</h1>
          <p className="mt-2 text-muted-foreground">AI 面试教练 · 登录</p>
        </div>

        {/* 微信扫码区域 */}
        <div className="rounded-lg border border-border bg-card p-8 text-center space-y-4 shadow-sm">
          <div className="mx-auto h-48 w-48 rounded-md bg-secondary flex items-center justify-center text-muted-foreground text-sm">
            微信扫码登录
          </div>
          <p className="text-sm text-muted-foreground">
            请使用微信扫描二维码登录
          </p>
        </div>

        {/* 开发模式 mock 登录 */}
        {process.env.NODE_ENV === "development" && (
          <button
            onClick={handleMockLogin}
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 text-primary-foreground font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? "登录中..." : "🔧 开发模式 · 一键登录"}
          </button>
        )}

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}
      </div>
    </main>
  );
}
