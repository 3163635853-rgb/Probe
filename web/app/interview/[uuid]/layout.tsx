import type { Metadata } from "next";

export function generateMetadata(): Metadata {
  return {
    title: "面试中 — Probe AI 面试官",
    description: "AI 面试进行中，专注回答每一题",
  };
}

export default function InterviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
