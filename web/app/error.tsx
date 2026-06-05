"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-4xl">⚠️</p>
        <h1 className="text-xl font-semibold">加载失败</h1>
        <p className="text-sm text-muted-foreground">
          {error.message || "请检查网络后重试"}
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-primary px-6 py-2.5 text-primary-foreground font-medium hover:bg-primary-hover transition-colors"
        >
          重试
        </button>
      </div>
    </main>
  );
}
