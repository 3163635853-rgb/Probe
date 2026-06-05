import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
          🎯 AI 驱动 · 真实模拟 · 即时反馈
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="text-primary">Probe</span>
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          你的 AI 面试教练，模拟真实面试场景，精准定位短板，助你拿下心仪 Offer
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
          <Link
            href="/interview/setup"
            className="rounded-full bg-primary px-8 py-3 text-primary-foreground font-medium hover:bg-primary-hover transition-colors shadow-md"
          >
            开始面试
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-border px-8 py-3 font-medium hover:bg-secondary transition-colors"
          >
            登录
          </Link>
        </div>
      </div>
    </main>
  );
}
