"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { fetchAPI } from "@/lib/api";
import type { LoginResponse } from "@/lib/types";

type Tab = "login" | "register";

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = tab === "login" ? "/auth/login" : "/auth/register";
    const body = tab === "login"
      ? { email, password }
      : { email, password, nickname };

    try {
      const data = await fetchAPI<LoginResponse>(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });
      login(data.token, data.user);
      router.replace("/interview/setup");
    } catch (e: any) {
      setError(e.message || (tab === "login" ? "登录失败" : "注册失败"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Probe</h1>
          <p className="mt-2 text-muted-foreground">AI 面试教练</p>
        </div>

        {/* Tab 切换 */}
        <div className="flex rounded-lg bg-secondary p-1">
          <button
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "login" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            登录
          </button>
          <button
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              tab === "register" ? "bg-card shadow-sm" : "text-muted-foreground"
            }`}
          >
            注册
          </button>
        </div>

        {/* 表单 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "register" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">昵称</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="你的名字"
                required
                className="w-full rounded-lg border border-input bg-card px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1.5">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full rounded-lg border border-input bg-card px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
              className="w-full rounded-lg border border-input bg-card px-4 py-3 text-base focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full bg-primary py-3 text-primary-foreground font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {loading ? "请稍候..." : tab === "login" ? "登录" : "注册"}
          </button>
        </form>
      </div>
    </main>
  );
}
