import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "登录 — Probe AI 面试官",
  description: "登录 Probe，开始你的 AI 面试训练",
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
