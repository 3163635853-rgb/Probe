"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen flex flex-col items-center justify-center px-4 bg-[#fafaf9] text-[#1c1917] font-sans">
        <div className="text-center space-y-4">
          <p className="text-4xl">😵</p>
          <h1 className="text-xl font-semibold">出了点问题</h1>
          <p className="text-sm text-[#78716c]">
            {error.message || "未知错误，请稍后再试"}
          </p>
          <button
            onClick={reset}
            className="rounded-full bg-[#d97706] px-6 py-2.5 text-white font-medium hover:bg-[#b45309] transition-colors"
          >
            重试
          </button>
        </div>
      </body>
    </html>
  );
}
