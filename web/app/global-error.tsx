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
          <div className="mx-auto w-12 h-12 rounded-full bg-[#dc2626]/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-[#dc2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
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
