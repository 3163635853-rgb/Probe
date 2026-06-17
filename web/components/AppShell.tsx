"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home, History, Crown, Bell, Gift, Ticket, Trophy, User, LogOut,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { ThemeToggle } from "./ThemeToggle";
import { PageTransition } from "./PageTransition";
import { useFetch } from "@/lib/hooks";

const NAV_ITEMS = [
  { href: "/interview/setup", label: "面试", icon: Home },
  { href: "/history", label: "记录", icon: History },
  { href: "/pricing", label: "套餐", icon: Crown },
  { href: "/invite", label: "邀请", icon: Gift },
  { href: "/notifications", label: "通知", icon: Bell },
];

const MORE_ITEMS = [
  { href: "/coupons", label: "优惠券", icon: Ticket },
  { href: "/achievements", label: "成就", icon: Trophy },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { data: unreadData } = useFetch<{ count: number }>("/notification/unread-count");
  const unreadCount = unreadData?.count || 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* 顶部导航 */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-4 sm:px-6 h-14">
          <Link href="/interview/setup" className="text-lg font-bold text-primary">
            Probe
          </Link>

          {/* 桌面导航 */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {item.href === "/notifications" && unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-[10px] text-destructive-foreground font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user && (
              <Link
                href="/profile"
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="个人资料"
              >
                <User className="w-3.5 h-3.5" />
              </Link>
            )}
            {user && (
              <button
                onClick={logout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="退出登录"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 内容 */}
      <div className="flex-1 flex flex-col">
        <PageTransition>{children}</PageTransition>
      </div>

      {/* 移动端底部 Tab */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/90 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px]">{item.label}</span>
                {item.href === "/notifications" && unreadCount > 0 && (
                  <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
