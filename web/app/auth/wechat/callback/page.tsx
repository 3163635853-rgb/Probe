"use client";

import { useEffect } from "react";

export default function WechatMobileCallbackPage() {
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error") || searchParams.get("errmsg");
    const target = new URL("probe://auth/wechat");
    if (code) target.searchParams.set("code", code);
    if (state) target.searchParams.set("state", state);
    if (error) target.searchParams.set("error", error);
    window.location.replace(target.toString());
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <p className="text-lg font-semibold">正在返回 Probe</p>
        <p className="mt-2 text-sm text-muted-foreground">如果没有自动打开 App，请返回 Probe 后重试。</p>
      </div>
    </main>
  );
}
