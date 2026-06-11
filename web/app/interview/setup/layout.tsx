"use client";

import { AppShell } from "@/components/AppShell";

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
