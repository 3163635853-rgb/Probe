"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, QrCode } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { fetchAPI } from "@/lib/api";
import type { LoginResponse } from "@/lib/types";

type AuthTab = "email" | "wechat";
type EmailMode = "login" | "register";

export default function LoginPage() {
  const [authTab, setAuthTab] = useState<AuthTab>("email");
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // 微信回调处理：/login?code=xxx&state=xxx
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (!code) return;
    // 验证 OAuth state 防止 CSRF
    const savedState = sessionStorage.getItem("oauth_state");
    if (state && savedState && state !== savedState) {
      setError("登录状态异常，请重试");
      return;
    }
    sessionStorage.removeItem("oauth_state");
    setLoading(true);
    fetchAPI<LoginResponse>("/auth/wechat", {
      method: "POST",
      body: JSON.stringify({ code }),
    })
      .then((data) => {
        login(data.token, data.user);
        router.replace("/interview/setup");
      })
      .catch((e: any) => setError(e.message || "微信登录失败"))
      .finally(() => setLoading(false));
  }, [searchParams, login, router]);

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const endpoint = emailMode === "login" ? "/auth/login" : "/auth/register";
    const body = emailMode === "login"
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
      setError(e.message || "操作失败");
    } finally {
      setLoading(false);
    }
  }

  // 微信扫码登录 URL（由后端生成，这里拼接开放平台 OAuth 地址）
  const [wechatAuthUrl, setWechatAuthUrl] = useState("");
  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_WECHAT_APPID || "APPID";
    const redirectUri = encodeURIComponent(window.location.origin + "/login");
    const state = crypto.randomUUID().slice(0, 16);
    sessionStorage.setItem("oauth_state", state);
    setWechatAuthUrl(`https://open.weixin.qq.com/connect/qrconnect?appid=${appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`);
  }, []);

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Probe</h1>
          <p className="mt-2 text-muted-foreground">AI 面试教练</p>
        </div>

        {/* 登录方式切换 */}
        <div className="flex rounded-lg bg-secondary p-1">
          <button
            onClick={() => { setAuthTab("email"); setError(""); }}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${authTab === "email" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            <Mail className="w-3.5 h-3.5" /> 邮箱
          </button>
          <button
            onClick={() => { setAuthTab("wechat"); setError(""); }}
            className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition-colors ${authTab === "wechat" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
          >
            <QrCode className="w-3.5 h-3.5" /> 微信
          </button>
        </div>

        {authTab === "wechat" ? (
          /* 微信扫码 */
          <div className="rounded-lg border border-border bg-card p-6 text-center space-y-4">
            <div className="mx-auto w-52 h-52 rounded-lg bg-secondary flex items-center justify-center overflow-hidden">
              {/* 微信开放平台二维码 iframe */}
              <iframe
                src={wechatAuthUrl}
                className="w-full h-full border-0 scale-[0.8] origin-center"
                title="微信扫码登录"
                sandbox="allow-scripts allow-same-origin allow-top-navigation"
              />
            </div>
            <p className="text-sm text-muted-foreground">打开微信扫一扫登录</p>
          </div>
        ) : (
          /* 邮箱登录/注册 */
          <>
            <div className="flex gap-4 justify-center text-sm">
              <button
                onClick={() => { setEmailMode("login"); setError(""); }}
                className={`pb-1 border-b-2 transition-colors ${emailMode === "login" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}
              >
                登录
              </button>
              <button
                onClick={() => { setEmailMode("register"); setError(""); }}
                className={`pb-1 border-b-2 transition-colors ${emailMode === "register" ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground"}`}
              >
                注册
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {emailMode === "register" && (
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

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary py-3 text-primary-foreground font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {loading ? "请稍候..." : emailMode === "login" ? "登录" : "注册"}
              </button>
            </form>
          </>
        )}

        {error && <p className="text-center text-sm text-destructive">{error}</p>}

        {loading && searchParams.get("code") && (
          <div className="text-center">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="mt-2 text-sm text-muted-foreground">微信登录中...</p>
          </div>
        )}
      </div>
    </main>
  );
}
