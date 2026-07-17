import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleDot,
  FileText,
  Gauge,
  Layers3,
  MessageSquareText,
  Mic2,
  Play,
  Quote,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  UserRound,
  WandSparkles,
  Zap,
} from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ThemeToggle } from "@/components/ThemeToggle";

const PROCESS_STEPS = [
  {
    number: "01",
    title: "选择目标岗位",
    description: "技术、产品、运营、市场等岗位都能练，难度和面试风格由你控制。",
    icon: Target,
  },
  {
    number: "02",
    title: "进入真实追问",
    description: "AI 根据你的回答继续深挖，不照着固定题库机械念下一题。",
    icon: MessageSquareText,
  },
  {
    number: "03",
    title: "拿到改进路径",
    description: "每题即时反馈，结束后生成五维报告和下一轮训练重点。",
    icon: TrendingUp,
  },
] as const;

const FEATURES: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
  className: string;
  detail: string;
}> = [
  {
    title: "追着答案继续问",
    description: "识别回答中的空白、矛盾和模糊表述，像真正的面试官一样往下追。",
    icon: BrainCircuit,
    className: "lg:col-span-2",
    detail: "Planner · Prober · Evaluator",
  },
  {
    title: "四种面试模式",
    description: "技术面、行为面、情景面、压力面，覆盖不同轮次和岗位场景。",
    icon: Layers3,
    className: "",
    detail: "按场景调节难度",
  },
  {
    title: "回答完就知道问题",
    description: "每道题即时评分，不用等到整场结束才发现表达偏题。",
    icon: Gauge,
    className: "",
    detail: "内容 · 结构 · 深度",
  },
  {
    title: "记住你的薄弱点",
    description: "跨场训练持续记录能力变化，把下一次练习放在真正需要提升的地方。",
    icon: TimerReset,
    className: "lg:col-span-2",
    detail: "长期成长轨迹",
  },
];

const CAPABILITIES = [
  { value: "4", label: "面试模式", note: "覆盖主流场景" },
  { value: "5", label: "评分维度", note: "定位回答短板" },
  { value: "51", label: "产品能力接口", note: "完整训练链路" },
  { value: "24h", label: "随时可练", note: "不用等待约面" },
] as const;

const REPORT_POINTS = [
  { icon: BarChart3, text: "五维雷达图看清能力分布" },
  { icon: FileText, text: "逐题复盘，不只给总分" },
  { icon: Zap, text: "自动生成下一轮训练重点" },
  { icon: ShieldCheck, text: "面试记录只为你的成长服务" },
] as const;

const REPORT_DIMENSIONS = [
  { label: "岗位理解", score: 88, width: "w-[88%]" },
  { label: "表达结构", score: 82, width: "w-[82%]" },
  { label: "内容深度", score: 76, width: "w-[76%]" },
  { label: "逻辑清晰", score: 85, width: "w-[85%]" },
  { label: "应变能力", score: 73, width: "w-[73%]" },
] as const;

function InterviewPreview() {
  return (
    <div className="probe-stage relative mx-auto w-full max-w-[560px] overflow-hidden rounded-[30px] border border-stone-900/10 bg-stone-950 text-stone-50 shadow-[0_32px_90px_rgba(28,25,23,0.24)] dark:border-white/10">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/80 to-transparent" />
      <div className="probe-stage-scan absolute inset-x-10 top-0 h-24 bg-gradient-to-b from-amber-300/10 to-transparent blur-xl" />

      <div className="relative flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-stone-950">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">产品经理 · 模拟一面</p>
            <p className="mt-0.5 text-[11px] text-stone-400">第 4 / 8 题 · 深度追问中</p>
          </div>
        </div>
        <span className="ml-3 inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          LIVE
        </span>
      </div>

      <div className="relative space-y-5 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex gap-3">
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10">
            <Sparkles className="h-4 w-4 text-amber-300" />
          </div>
          <div className="max-w-[88%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/[0.06] px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-300">AI 面试官</p>
            <p className="mt-2 text-sm leading-6 text-stone-100 sm:text-[15px]">
              你提到上线后留存提升了 18%。这个结果里，哪一部分最能证明是你的策略起了作用？
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <div className="max-w-[86%] rounded-2xl rounded-tr-sm bg-amber-400 px-4 py-3.5 text-stone-950">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-700">你的回答</p>
            <p className="mt-2 text-sm leading-6 sm:text-[15px]">我们重做了新用户引导，把关键动作从 5 步缩短到 3 步……</p>
          </div>
          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
            <UserRound className="h-4 w-4 text-stone-300" />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <CircleDot className="h-3.5 w-3.5" />
              正在分析回答
            </div>
            <span className="font-mono text-[10px] text-stone-500">2.4s</span>
          </div>
          <div className="mt-4 flex h-8 items-end gap-1.5" aria-hidden="true">
            {[14, 24, 18, 30, 22, 28, 16, 25, 32, 19, 27, 15, 23, 29, 18, 25].map((height, index) => (
              <span
                key={`${height}-${index}`}
                className="probe-wave-bar w-full rounded-full bg-gradient-to-t from-amber-500 to-amber-200"
                style={{ height, animationDelay: `${index * 70}ms` }}
              />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {["缺少归因证据", "指标口径需澄清", "适合继续追问"].map((tag) => (
              <span key={tag} className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] text-stone-300">{tag}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="relative flex items-center justify-between border-t border-white/10 px-5 py-4 text-xs text-stone-400 sm:px-7">
        <span className="inline-flex items-center gap-2"><Mic2 className="h-4 w-4 text-amber-300" />支持语音回答</span>
        <span className="font-mono">04:26</span>
      </div>
    </div>
  );
}

function ReportPreview() {
  return (
    <div className="relative overflow-hidden rounded-[28px] border border-stone-800 bg-stone-950 p-5 text-stone-50 shadow-[0_30px_80px_rgba(28,25,23,0.18)] sm:p-7">
      <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Interview report</p>
          <h3 className="mt-2 text-xl font-bold">产品经理 · 模拟一面</h3>
          <p className="mt-1 text-xs text-stone-500">8 道题 · 26 分钟 · 已完成</p>
        </div>
        <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-semibold text-emerald-300">较上次 +7</span>
      </div>

      <div className="relative mt-6 grid gap-5 sm:grid-cols-[0.72fr_1.28fr]">
        <div className="flex min-h-48 flex-col justify-between rounded-2xl border border-amber-300/20 bg-amber-300/[0.07] p-5">
          <div>
            <p className="text-xs text-stone-400">综合表现</p>
            <div className="mt-2 flex items-end gap-2">
              <span className="text-6xl font-bold tracking-[-0.07em] text-amber-300">82</span>
              <span className="pb-2 text-sm text-stone-500">/ 100</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-stone-100">优势：结构清晰</p>
            <p className="mt-1 text-xs leading-5 text-stone-400">能先给结论，再用数据支撑判断。</p>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">五维能力分布</p>
            <BarChart3 className="h-4 w-4 text-amber-300" />
          </div>
          <div className="mt-5 space-y-4">
            {REPORT_DIMENSIONS.map((dimension) => (
              <div key={dimension.label}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-stone-400">{dimension.label}</span>
                  <span className="font-mono text-stone-200">{dimension.score}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div className={`${dimension.width} h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-200`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
          <Sparkles className="h-4 w-4" />下一轮优先练习
        </div>
        <p className="mt-3 text-sm leading-6 text-stone-300">回答结果类问题时，补充基准数据和对照组，避免把“参与了项目”说成“证明了影响”。</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {["结果归因", "数据口径", "STAR 收尾"].map((tag) => (
            <span key={tag} className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] text-stone-400">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-clip bg-background text-foreground">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Probe 首页">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Quote className="h-4 w-4 fill-current" />
            </span>
            <span className="text-lg font-bold tracking-[-0.04em]">Probe</span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="首页导航">
            <a href="#experience" className="transition-colors hover:text-foreground">体验</a>
            <a href="#how-it-works" className="transition-colors hover:text-foreground">流程</a>
            <a href="#features" className="transition-colors hover:text-foreground">能力</a>
            <a href="#report" className="transition-colors hover:text-foreground">报告</a>
          </nav>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link href="/login" className="hidden text-sm font-medium transition-colors hover:text-primary sm:inline-flex">登录</Link>
            <Link href="/interview/setup" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition-all hover:bg-primary-hover sm:px-5 sm:text-sm">
              <span className="sm:hidden">开始</span>
              <span className="hidden sm:inline">开始面试</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section id="experience" className="relative isolate overflow-hidden px-4 pb-20 pt-28 sm:px-6 sm:pb-28 sm:pt-36 lg:px-8 lg:pb-32 lg:pt-40">
          <div className="pointer-events-none absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_18%,rgba(245,158,11,0.14),transparent_30%),radial-gradient(circle_at_88%_30%,rgba(13,148,136,0.08),transparent_24%)]" />
          <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.32] [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_88%)]" />

          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[minmax(0,0.94fr)_minmax(420px,1.06fr)] lg:gap-16">
            <div className="max-w-2xl">
              <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] px-3.5 py-2 text-xs font-semibold text-primary opacity-0 [animation-delay:120ms] [animation-fill-mode:forwards] sm:text-sm">
                <WandSparkles className="h-4 w-4" />AI 深度追问 · 中文岗位训练
              </div>

              <h1 className="animate-fade-in-up mt-7 text-[clamp(2.75rem,6vw,4.65rem)] font-bold leading-[1.04] tracking-[-0.065em] opacity-0 [animation-delay:260ms] [animation-fill-mode:forwards]">
                <span className="block">把每一次回答，</span>
                <span className="mt-2 block text-primary">练成面试官</span>
                <span className="block text-primary">想听的样子。</span>
              </h1>

              <p className="animate-fade-in-up mt-7 max-w-xl text-base leading-8 text-muted-foreground opacity-0 [animation-delay:400ms] [animation-fill-mode:forwards] sm:text-lg">
                Probe 不会只念完题库。它会听懂你的回答、继续追问薄弱处，并把模糊表达变成下一轮能直接使用的改进建议。
              </p>

              <div className="animate-fade-in-up mt-9 flex flex-col gap-3 opacity-0 [animation-delay:540ms] [animation-fill-mode:forwards] sm:flex-row sm:items-center">
                <Link href="/interview/setup" className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 font-semibold text-primary-foreground shadow-[0_14px_34px_rgba(217,119,6,0.24)] transition-all hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-[0_18px_40px_rgba(217,119,6,0.3)]">
                  免费开始一场面试<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-border bg-card/70 px-6 py-3.5 font-medium transition-colors hover:bg-secondary">
                  <Play className="h-4 w-4 fill-current text-primary" />看看它怎么追问
                </a>
              </div>

              <div className="animate-fade-in-up mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground opacity-0 [animation-delay:680ms] [animation-fill-mode:forwards] sm:text-sm">
                {["每月 3 次免费", "无需绑卡", "支持语音输入"].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success/10 text-success"><Check className="h-2.5 w-2.5" strokeWidth={3} /></span>
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="animate-fade-in-up relative min-w-0 opacity-0 [animation-delay:420ms] [animation-fill-mode:forwards]">
              <div className="absolute -left-10 top-16 hidden rounded-2xl border border-border bg-card p-3 shadow-lg xl:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">追问命中</p>
                <p className="mt-1 text-2xl font-bold text-foreground">归因逻辑</p>
              </div>
              <div className="absolute -right-8 bottom-20 z-10 hidden rounded-2xl border border-border bg-card p-3 shadow-lg xl:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">实时反馈</p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-success"><TrendingUp className="h-4 w-4" />表达更具体</p>
              </div>
              <InterviewPreview />
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-card/55 px-4 py-7 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-7 md:grid-cols-4">
            {CAPABILITIES.map((item) => (
              <div key={item.label} className="relative px-2 md:border-l md:border-border md:px-6 md:first:border-l-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold tracking-[-0.04em] sm:text-3xl">{item.value}</span>
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">一场训练，三次推进</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">不只是回答问题，而是完成一次可复用的进步。</h2>
            </ScrollReveal>

            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {PROCESS_STEPS.map((step, index) => {
                const Icon = step.icon;
                return (
                  <ScrollReveal key={step.number} delay={index * 110}>
                    <article className="group relative h-full overflow-hidden rounded-[26px] border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg sm:p-8">
                      <div className="absolute right-5 top-3 font-mono text-6xl font-bold text-foreground/[0.035]">{step.number}</div>
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-5 w-5" /></div>
                      <p className="mt-8 font-mono text-xs font-semibold text-primary">STEP {step.number}</p>
                      <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
                      <p className="mt-3 leading-7 text-muted-foreground">{step.description}</p>
                    </article>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="features" className="bg-stone-950 px-4 py-24 text-stone-50 sm:px-6 sm:py-32 lg:px-8 dark:bg-black">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">为什么练得更像真实面试</p>
                <h2 className="mt-4 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">把压力留在练习里，把清晰带到面试现场。</h2>
              </div>
              <p className="max-w-md text-sm leading-7 text-stone-400 sm:text-base">每个能力都服务同一件事：让你发现“自我感觉回答不错”和“面试官真的听懂并相信”之间的差距。</p>
            </ScrollReveal>

            <div className="mt-14 grid gap-4 lg:grid-cols-3">
              {FEATURES.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <ScrollReveal key={feature.title} delay={index * 80} className={feature.className}>
                    <article className="group relative h-full min-h-[270px] overflow-hidden rounded-[26px] border border-white/10 bg-white/[0.045] p-6 transition-colors hover:border-amber-300/30 hover:bg-white/[0.07] sm:p-8">
                      <div className="absolute -bottom-16 -right-12 h-40 w-40 rounded-full bg-amber-300/[0.06] blur-3xl transition-colors group-hover:bg-amber-300/[0.12]" />
                      <div className="relative flex h-full flex-col">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300"><Icon className="h-5 w-5" /></div>
                          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-stone-500">{feature.detail}</span>
                        </div>
                        <div className="mt-auto pt-12">
                          <h3 className="text-2xl font-bold tracking-[-0.03em]">{feature.title}</h3>
                          <p className="mt-3 max-w-xl leading-7 text-stone-400">{feature.description}</p>
                        </div>
                      </div>
                    </article>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>

        <section id="report" className="overflow-hidden px-4 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-20">
            <ScrollReveal>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-primary">不止给分数</p>
              <h2 className="mt-4 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">报告要告诉你，下一次具体怎么答。</h2>
              <p className="mt-6 text-base leading-8 text-muted-foreground sm:text-lg">从表达结构、内容深度到岗位匹配度，拆开每个失分点，并给出能直接带进下一轮练习的建议。</p>
              <div className="mt-8 space-y-4">
                {REPORT_POINTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.text} className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span>
                      <span className="font-medium">{item.text}</span>
                    </div>
                  );
                })}
              </div>
              <Link href="/interview/setup" className="group mt-9 inline-flex items-center gap-2 font-semibold text-primary">生成我的第一份报告<ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
            </ScrollReveal>

            <ScrollReveal direction="left" distance={55}>
              <div className="relative">
                <div className="absolute -inset-8 -z-10 rounded-full bg-primary/10 blur-3xl" />
                <ReportPreview />
              </div>
            </ScrollReveal>
          </div>
        </section>

        <section className="px-4 pb-24 sm:px-6 sm:pb-32 lg:px-8">
          <ScrollReveal className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-[34px] bg-primary px-6 py-14 text-primary-foreground sm:px-12 sm:py-16 lg:px-16">
              <div className="absolute -right-24 -top-28 h-80 w-80 rounded-full border-[52px] border-white/10" />
              <div className="absolute -bottom-28 right-36 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="relative max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">下一次面试，从这次练习开始改变</p>
                <h2 className="mt-4 text-3xl font-bold tracking-[-0.045em] sm:text-5xl">先把回答说出来，再把它练到更有说服力。</h2>
                <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">免费体验，无需绑卡。选择岗位和难度，几分钟后开始第一轮真实追问。</p>
                <Link href="/interview/setup" className="group mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-stone-950 px-7 py-3.5 font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 dark:bg-white dark:text-stone-950">免费开始面试<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></Link>
              </div>
            </div>
          </ScrollReveal>
        </section>
      </main>

      <footer className="border-t border-border px-4 py-9 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Quote className="h-4 w-4 fill-current" /></span>
            <div><p className="font-bold">Probe</p><p className="text-xs text-muted-foreground">会追问、会复盘的 AI 面试教练</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <a href="#how-it-works" className="transition-colors hover:text-foreground">使用流程</a>
            <a href="#features" className="transition-colors hover:text-foreground">产品能力</a>
            <Link href="/pricing" className="transition-colors hover:text-foreground">会员方案</Link>
            <Link href="/privacy" className="transition-colors hover:text-foreground">隐私政策</Link>
            <Link href="/terms" className="transition-colors hover:text-foreground">用户协议</Link>
            <Link href="/login" className="transition-colors hover:text-foreground">登录</Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 Probe</p>
        </div>
      </footer>
    </div>
  );
}
