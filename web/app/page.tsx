"use client";

import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Brain, Zap, BarChart3, Target, ArrowRight,
  MessageSquare, FileText, Sparkles, Shield, Users, Clock,
  ChevronRight, Layers, Code2, ExternalLink,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      {/* NAV */}
      <nav className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="text-xl font-bold text-primary tracking-tight">Probe</Link>
          <div className="hidden sm:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">功能</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">流程</a>
            <a href="#tech" className="hover:text-foreground transition-colors">技术</a>
            <a href="#stats" className="hover:text-foreground transition-colors">数据</a>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">登录</Link>
            <Link href="/interview/setup" className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors">开始面试</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-4 pt-32 pb-24">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {/* AI 生成的背景图 */}
          <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
            <img src="/hero-bg.png" alt="" className="w-full h-full object-cover" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
          <div className="absolute top-[10%] left-[5%] w-80 h-80 rounded-full bg-primary/[0.04] blur-3xl animate-float" />
          <div className="absolute bottom-[15%] right-[5%] w-[28rem] h-[28rem] rounded-full bg-primary/[0.06] blur-3xl animate-float-delay" />
          <div className="absolute inset-0 bg-[linear-gradient(var(--primary)/0.02_1px,transparent_1px),linear-gradient(90deg,var(--primary)/0.02_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
        </div>

        <div className="animate-fade-in-up opacity-0 [animation-delay:200ms] [animation-fill-mode:forwards]">
          <span className="inline-flex items-center gap-2.5 rounded-full border border-primary/20 bg-primary/[0.04] px-5 py-2.5 text-sm font-medium text-primary backdrop-blur-sm">
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-primary" /></span>
            AI Agent 驱动 · 不只是 ChatBot
          </span>
        </div>

        <h1 className="mt-10 text-center animate-fade-in-up opacity-0 [animation-delay:400ms] [animation-fill-mode:forwards]">
          <span className="block text-[3.2rem] sm:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.1]">面试练习</span>
          <span className="block mt-3 text-[3.2rem] sm:text-6xl lg:text-[5.5rem] font-bold tracking-tight leading-[1.1]">从此有了<span className="text-primary">教练</span></span>
        </h1>

        <p className="mt-8 max-w-2xl text-center text-lg sm:text-xl text-muted-foreground leading-relaxed animate-fade-in-up opacity-0 [animation-delay:600ms] [animation-fill-mode:forwards]">
          AI 智能体全程模拟真实面试，实时追问、即时评分、精准报告。<br className="hidden sm:block" />每一轮对话，都在帮你变得更强。
        </p>
        <div className="mt-12 flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up opacity-0 [animation-delay:800ms] [animation-fill-mode:forwards]">
          <Link href="/interview/setup" className="group relative inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300">
            免费开始 <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a href="#how-it-works" className="inline-flex items-center gap-1.5 rounded-full border border-border px-7 py-4 text-lg font-medium hover:bg-secondary hover:border-primary/20 transition-all duration-300">
            看看怎么用 <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </a>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
          <div className="w-5 h-8 rounded-full border-2 border-muted-foreground/40 flex items-start justify-center pt-1.5">
            <div className="w-1 h-2 rounded-full bg-muted-foreground/60" />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="relative px-4 py-28 sm:py-36">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-secondary/60 via-secondary/30 to-transparent" />
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="text-center">
              <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-4">使用流程</span>
              <h2 className="text-3xl sm:text-5xl font-bold">三步，拿到你的面试报告</h2>
            </div>
          </ScrollReveal>
          <div className="mt-20 relative">
            <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
              {[
                { icon: MessageSquare, step: "01", title: "配置面试", desc: "选择行业岗位，设定难度，粘贴 JD 获得定制化面试体验" },
                { icon: Sparkles, step: "02", title: "实战对话", desc: "AI 面试官实时追问、引导作答，完全模拟真实面试节奏" },
                { icon: FileText, step: "03", title: "深度报告", desc: "五维雷达图 + 逐题回放 + 改进路径，清晰知道下一步练什么" },
              ].map((item, i) => (
                <ScrollReveal key={item.step} delay={i * 150} distance={30}>
                  <div className="relative flex flex-col items-center text-center">
                    <div className="relative z-10 inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-card border border-border shadow-md">
                      <item.icon className="w-8 h-8 text-primary" />
                      <span className="absolute -top-2 -right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shadow-sm">{item.step}</span>
                    </div>
                    <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative px-4 py-28 sm:py-36">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-4">核心能力</span>
              <h2 className="text-3xl sm:text-5xl font-bold leading-tight">不是问答机器<br />是<span className="text-primary">会思考的面试官</span></h2>
            </div>
          </ScrollReveal>
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: Brain, title: "自主决策的 AI Agent", desc: "面试官 Agent 自主规划面试流程，根据你的回答实时调整策略：追问薄弱点、跳过已掌握的领域、适时给出引导提示。", accent: "from-primary/10 to-primary/5" },
              { icon: Zap, title: "逐题实时评分", desc: "不用等面试结束。每道题回答完毕，AI 即刻从多维度打分并给出简评，帮你实时感知自己的表现。", accent: "from-success/10 to-success/5" },
              { icon: BarChart3, title: "五维深度报告", desc: "专业知识、逻辑表达、问题解决、沟通能力、抗压能力 — 雷达图 + 逐题点评 + 改进建议，一份报告看清全貌。", accent: "from-primary/10 to-primary/5" },
              { icon: Target, title: "越练越懂你", desc: "记忆系统记住你的历史表现，下次面试自动强化薄弱环节，难度随能力动态升级。每次都有新挑战。", accent: "from-success/10 to-success/5" },
            ].map((feat, i) => (
              <ScrollReveal key={feat.title} delay={i * 100}>
                <div className="group relative overflow-hidden rounded-3xl border border-border bg-card p-8 sm:p-10 hover:border-primary/20 hover:shadow-lg transition-all duration-500">
                  <div className={`absolute inset-0 bg-gradient-to-br ${feat.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/10 group-hover:bg-primary/15 transition-colors">
                      <feat.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold">{feat.title}</h3>
                    <p className="mt-3 text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
      {/* DEMO PREVIEW */}
      <section className="relative px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="text-center mb-10">
              <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-4">Live Preview</span>
              <h2 className="text-2xl sm:text-4xl font-bold">一次面试，一份完整报告</h2>
            </div>
          </ScrollReveal>
          <ScrollReveal delay={200} distance={50}>
            <div className="rounded-3xl border border-border bg-card shadow-xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-secondary/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/50" />
                  <div className="w-3 h-3 rounded-full bg-primary/50" />
                  <div className="w-3 h-3 rounded-full bg-success/50" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 rounded-md bg-background/80 text-xs text-muted-foreground border border-border/50">probe.app/report</div>
                </div>
              </div>
              <div className="relative">
                <img src="/report-mockup.png" alt="Probe 面试报告示例" className="w-full h-auto" />
                <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                  <Link href="/interview/setup" className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                    生成我的报告 <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* STATS */}
      <section id="stats" className="relative px-4 py-28 sm:py-36">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="rounded-3xl border border-border bg-card p-10 sm:p-16 shadow-sm">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
                {[
                  { value: 12847, suffix: "+", label: "面试完成", icon: MessageSquare },
                  { value: 4200, suffix: "+", label: "注册用户", icon: Users },
                  { value: 96, suffix: "%", label: "好评率", icon: Shield },
                  { value: 35, suffix: "+", label: "覆盖岗位", icon: Clock },
                ].map((stat) => (
                  <div key={stat.label} className="text-center">
                    <stat.icon className="w-5 h-5 text-muted-foreground mx-auto mb-3" />
                    <p className="text-3xl sm:text-4xl font-bold text-foreground"><CountUp target={stat.value} /><span className="text-primary">{stat.suffix}</span></p>
                    <p className="mt-1.5 text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* TECH ARCHITECTURE — 展示技术实力 */}
      <section id="tech" className="relative px-4 py-28 sm:py-36">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-secondary/40 to-transparent" />
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <span className="inline-block text-sm font-semibold text-primary uppercase tracking-wider mb-4">Technical Architecture</span>
              <h2 className="text-3xl sm:text-5xl font-bold leading-tight">不是调 API 的玩具<br />是<span className="text-primary">完整的智能体系统</span></h2>
            </div>
          </ScrollReveal>

          {/* Agent 架构图 */}
          <ScrollReveal delay={200} distance={50}>
            <div className="mt-16 rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* 左侧：架构可视化图 */}
                <div className="flex items-center justify-center">
                  <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden border border-border/50 bg-background/50">
                    <img src="/architecture.png" alt="Probe Agent Architecture" className="w-full h-full object-contain p-4" />
                  </div>
                </div>

                {/* 右侧：技术栈标签 */}
                <div className="space-y-6">
                  <h3 className="text-xl font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-primary" /> 技术栈</h3>
                  <div className="space-y-4">
                    {[
                      { layer: "智能体", tags: ["自研 Agent Loop", "ReAct 架构", "4 子智能体", "状态机"] },
                      { layer: "后端", tags: ["Python 3.12", "FastAPI", "SQLAlchemy 2.0", "SSE 流式"] },
                      { layer: "AI", tags: ["DeepSeek API", "FAISS 向量检索", "BGE-M3 Embedding"] },
                      { layer: "前端", tags: ["Next.js 16", "TypeScript", "Tailwind CSS", "Recharts"] },
                      { layer: "基础设施", tags: ["Docker Compose", "MySQL 8", "Redis 7", "Caddy", "GitHub Actions"] },
                    ].map(group => (
                      <div key={group.layer}>
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{group.layer}</span>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {group.tags.map(tag => (
                            <span key={tag} className="inline-block px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium text-foreground hover:border-primary/30 hover:bg-primary/5 transition-colors cursor-default">{tag}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* 项目指标 */}
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "代码量", value: "16,000+", unit: "行" },
              { label: "API 端点", value: "23+", unit: "个" },
              { label: "数据库表", value: "20+", unit: "张" },
              { label: "开发周期", value: "4", unit: "周" },
            ].map((item, i) => (
              <ScrollReveal key={item.label} delay={i * 100}>
                <div className="rounded-2xl border border-border bg-card p-5 text-center hover:border-primary/20 transition-colors">
                  <p className="text-2xl font-bold text-foreground">{item.value}<span className="text-sm font-normal text-muted-foreground ml-1">{item.unit}</span></p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.label}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* BUILDER — 开发者信息 */}
      <section className="relative px-4 py-28 sm:py-36">
        <div className="mx-auto max-w-4xl">
          <ScrollReveal distance={50}>
            <div className="rounded-3xl border border-border bg-card p-8 sm:p-12 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-8 items-start">
                <div className="shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10">
                  <Code2 className="w-9 h-9 text-primary" />
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-2xl font-bold">独立全栈开发</h3>
                    <p className="mt-2 text-muted-foreground leading-relaxed">
                      从产品设计、架构设计、数据库建模，到后端 Agent 开发、前端实现、部署运维 — 全部由一个人独立完成。
                      不是用模板拼凑的 demo，是可以服务真实用户的生产级系统。
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    {[
                      { label: "架构设计", desc: "Agent 状态机 + 三层记忆 + 向量检索" },
                      { label: "工程质量", desc: "完整 CI/CD + Docker + Alembic 迁移" },
                      { label: "产品思维", desc: "竞品分析 → 差异化定位 → MVP 落地" },
                    ].map(item => (
                      <div key={item.label} className="p-3 rounded-xl bg-secondary/50 border border-border/50">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 pt-3">
                    <a href="https://github.com/3163635853-rgb/Probe" target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                      <ExternalLink className="w-4 h-4" /> 查看源码
                    </a>
                    <span className="text-border">|</span>
                    <span className="text-sm text-muted-foreground">全栈工程师 · 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="relative px-4 py-28 sm:py-36">
        <div className="absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
          <div className="w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[120px]" />
        </div>
        <ScrollReveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl sm:text-5xl font-bold leading-tight">下一个 Offer<br />从这里开始</h2>
          <p className="mt-5 text-lg text-muted-foreground">免费体验，无需绑卡。每月 3 次免费面试机会。</p>
          <Link href="/interview/setup" className="group inline-flex items-center gap-2 mt-10 rounded-full bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:scale-[1.03] active:scale-[0.98] transition-all duration-300">
            免费开始面试 <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </ScrollReveal>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <span className="text-lg font-bold text-primary">Probe</span>
            <nav className="hidden sm:flex gap-5 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">功能</a>
              <a href="#how-it-works" className="hover:text-foreground transition-colors">流程</a>
              <Link href="/login" className="hover:text-foreground transition-colors">登录</Link>
            </nav>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Probe. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
