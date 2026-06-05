export default function SetupLoading() {
  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* 进度条骨架 */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-muted animate-pulse" />
          ))}
        </div>
        {/* 卡片骨架 */}
        <div className="space-y-4">
          <div className="h-6 w-32 rounded bg-muted animate-pulse" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
