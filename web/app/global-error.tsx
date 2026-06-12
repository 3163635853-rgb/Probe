"use client";

import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col items-center justify-center px-4 bg-background text-foreground font-sans">
        <div className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">出了点问题</h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "未知错误，请稍后再试"}
          </p>
          <button
            onClick={reset}
            className="rounded-full bg-primary px-6 py-2.5 text-primary-foreground font-medium hover:bg-primary-hover transition-colors"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
