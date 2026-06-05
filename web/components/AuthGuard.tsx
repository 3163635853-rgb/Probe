"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { logged, loading } = useAuth();
  const router = useRouter();
  const isDev = process.env.NODE_ENV === "development";

  useEffect(() => {
    if (!loading && !logged && !isDev) {
      router.replace("/login");
    }
  }, [loading, logged, router, isDev]);

  if (loading && !isDev) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!logged && !isDev) return null;

  return <>{children}</>;
}
