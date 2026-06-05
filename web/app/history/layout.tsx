import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "面试记录 — Probe AI 面试官",
  description: "查看你的面试历史和成绩变化",
};

export default function HistoryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
