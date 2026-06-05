import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-muted-foreground">404</p>
        <p className="text-lg text-muted-foreground">页面不存在</p>
        <Link
          href="/"
          className="inline-block rounded-full bg-primary px-6 py-2.5 text-primary-foreground font-medium hover:bg-primary-hover transition-colors"
        >
          返回首页
        </Link>
      </div>
    </main>
  );
}
