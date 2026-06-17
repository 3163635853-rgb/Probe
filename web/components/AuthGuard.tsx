"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

const BYPASS_AUTH = process.env.NEXT_PUBLIC_BYPASS_AUTH === "true";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { logged, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !logged && !BYPASS_AUTH) {
      router.replace("/login");
    }
  }, [loading, logged, router]);

  if (loading && !BYPASS_AUTH) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!logged && !BYPASS_AUTH) return null;

  return <>{children}</>;
}
