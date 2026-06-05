import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "面试报告 — Probe AI 面试官",
    description: "查看你的面试表现分析、维度评分和改进建议",
  };
}

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
