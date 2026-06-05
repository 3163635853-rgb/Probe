import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "面试配置 — Probe AI 面试官",
  description: "选择行业、岗位、模式，开始一场 AI 模拟面试",
};

export default function SetupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
