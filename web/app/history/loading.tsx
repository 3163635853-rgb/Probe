export default function HistoryLoading() {
  return (
    <main className="flex-1">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    </main>
  );
}
