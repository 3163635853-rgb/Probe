"use client";

import { useState } from "react";
import { BookOpenText, Building2, Code2, FileUser, Repeat2, Video } from "lucide-react";
import { CareerPanel } from "./CareerPanel";
import { PracticePanel } from "./PracticePanel";
import { VideoPanel } from "./VideoPanel";
import { EnterprisePanel } from "./EnterprisePanel";
import { TechnicalPanel } from "./TechnicalPanel";
import { CoachPanel } from "./CoachPanel";

const TABS = [
  { key: "career", label: "经历库", hint: "简历与 STAR", icon: FileUser },
  { key: "practice", label: "专项复练", hint: "短练与答案优化", icon: Repeat2 },
  { key: "video", label: "表达分析", hint: "录像与节奏", icon: Video },
  { key: "coach", label: "真人点评", hint: "提交与跟进", icon: BookOpenText },
  { key: "enterprise", label: "组织空间", hint: "题库与 Rubric", icon: Building2 },
  { key: "technical", label: "技术面", hint: "代码、SQL、白板", icon: Code2 },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function TrainingStudio() {
  const [tab, setTab] = useState<TabKey>("career");

  return (
    <main className="flex-1 px-4 pb-24 pt-7 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="relative overflow-hidden rounded-[28px] border border-border bg-card px-6 py-7 shadow-sm sm:px-9 sm:py-9">
          <div className="absolute inset-y-0 right-0 hidden w-[42%] opacity-70 lg:block" aria-hidden>
            <div className="absolute right-10 top-8 h-28 w-28 rounded-full border border-primary/20" />
            <div className="absolute right-24 top-20 h-36 w-36 rounded-full border border-primary/10" />
            <div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.16),transparent_65%)]" />
          </div>
          <div className="relative max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-primary">Probe Training Studio</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">把每次反馈，变成下一次更好的回答</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              从候选人证据库出发，完成专项训练、视频回看、真人点评和技术面练习。这里不是新增页面集合，而是一条持续复练的工作台。
            </p>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="flex h-fit gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm lg:sticky lg:top-20 lg:block">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = item.key === tab;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setTab(item.key)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors lg:mb-1 lg:w-full lg:gap-3 lg:py-3 lg:last:mb-0 ${active ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className={`hidden text-[11px] lg:block ${active ? "text-primary-foreground/75" : "text-muted-foreground"}`}>{item.hint}</span>
                  </span>
                </button>
              );
            })}
          </aside>

          <section className="min-w-0">
            {tab === "career" && <CareerPanel />}
            {tab === "practice" && <PracticePanel />}
            {tab === "video" && <VideoPanel />}
            {tab === "coach" && <CoachPanel />}
            {tab === "enterprise" && <EnterprisePanel />}
            {tab === "technical" && <TechnicalPanel />}
          </section>
        </div>
      </div>
    </main>
  );
}
