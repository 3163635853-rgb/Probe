import Link from "next/link";
import { CountUp } from "@/components/CountUp";
import { Brain, Zap, BarChart3, Target } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen overflow-hidden">
      {/* ===== HERO ===== */}
      <section className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 pt-20 pb-32">
        {/* Background effects */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {/* Warm radial gradient */}
          <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[140%] h-[80%] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(251,191,36,0.12)_0%,transparent_70%)]" />
          {/* Floating orbs */}
          <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-primary/5 blur-3xl animate-float" />
          <div className="absolute bottom-[20%] right-[8%] w-96 h-96 rounded-full bg-primary/8 blur-3xl animate-float-delay" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(217,119,6,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(217,119,6,0.03)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
        </div>

        {/* Badge */}
        <div className="animate-fade-in-up opacity-0 [animation-delay:200ms] [animation-fill-mode:forwards]">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-5 py-2 text-sm font-medium text-primary backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            AI 智能体驱动 · 不是简单的 ChatBot
          </span>
        </div>

        {/* Main heading */}
        <h1 className="mt-8 text-center animate-fade-in-up opacity-0 [animation-delay:400ms] [animation-fill-mode:forwards]">
          <span className="block text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight">
            你的 AI
          </span>
          <span className="block mt-2 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-primary">
            面试教练
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-xl text-center text-lg sm:text-xl text-muted-foreground leading-relaxed animate-fade-in-up opacity-0 [animation-delay:600ms] [animation-fill-mode:forwards]">
          模拟真实面试场景，精准定位你的短板
          <br className="hidden sm:block" />
          每一次练习，都离 Offer 更近一步
        </p>

        {/* CTA */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up opacity-0 [animation-delay:800ms] [animation-fill-mode:forwards]">
          <Link
            href="/interview/setup"
            className="group relative rounded-full bg-primary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
          >
            <span className="relative z-10">免费开始面试</span>
            <div className="absolute inset-0 rounded-full bg-primary-hover opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
          <Link
            href="#features"
            className="rounded-full border border-border px-8 py-4 text-lg font-medium hover:bg-secondary hover:border-primary/20 transition-all duration-300"
          >
            了解更多 ↓
          </Link>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="features" className="relative px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl sm:text-4xl font-bold animate-fade-in-up opacity-0 [animation-delay:100ms] [animation-fill-mode:forwards]">
            不只是问答，是<span className="text-primary">完整的面试体验</span>
          </h2>
          <p className="mt-4 text-center text-muted-foreground text-lg">
            Agent 架构 · 自主规划 · 记忆追问 · 实时评估
          </p>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Brain,
                title: "AI 智能体",
                desc: "不是固定题库，Agent 自主决策下一步：追问、换题、给提示",
              },
              {
                icon: Zap,
                title: "实时反馈",
                desc: "每道题即时评分，不用等面试结束才知道哪里答得不好",
              },
              {
                icon: BarChart3,
                title: "五维评估",
                desc: "专业知识、逻辑表达、问题解决、沟通能力、抗压能力全方位打分",
              },
              {
                icon: Target,
                title: "个性化训练",
                desc: "记住你的弱点，下次面试自动加强薄弱维度，越练越准",
              },
            ].map((feat, i) => (
              <div
                key={feat.title}
                className={`group relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 animate-fade-in-up opacity-0 [animation-fill-mode:forwards]`}
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <feat.icon className="relative w-8 h-8 text-primary" />
                <h3 className="relative mt-4 text-lg font-semibold">{feat.title}</h3>
                <p className="relative mt-2 text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section className="relative px-4 py-24 sm:py-32 bg-secondary/50">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl sm:text-4xl font-bold">
            三步开始，<span className="text-primary">简单到不行</span>
          </h2>

          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-12">
            {[
              { step: "01", title: "选择岗位", desc: "挑行业、选职位、定难度，粘贴 JD 更精准" },
              { step: "02", title: "AI 面试", desc: "像真实面试一样对话，AI 会追问、会引导" },
              { step: "03", title: "获得报告", desc: "五维雷达图 + 逐题点评 + 改进建议，一目了然" },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative text-center animate-fade-in-up opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${300 + i * 150}ms` }}
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary text-2xl font-bold">
                  {item.step}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                {i < 2 && (
                  <div className="hidden sm:block absolute top-8 -right-6 text-2xl text-muted-foreground/30">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATS ===== */}
      <section className="relative px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { value: 12847, suffix: "+", label: "模拟面试完成" },
              { value: 4200, suffix: "+", label: "注册用户" },
              { value: 96, suffix: "%", label: "用户好评率" },
              { value: 35, suffix: "+", label: "覆盖岗位" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="text-center animate-fade-in-up opacity-0 [animation-fill-mode:forwards]"
                style={{ animationDelay: `${200 + i * 100}ms` }}
              >
                <p className="text-4xl sm:text-5xl font-bold text-primary">
                  <CountUp target={stat.value} />{stat.suffix}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="relative px-4 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl text-center">
          {/* Glow background */}
          <div className="absolute inset-0 -z-10 flex items-center justify-center">
            <div className="w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px]" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-bold">
            准备好了吗？
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            每一次练习都是一次成长，从今天开始
          </p>
          <Link
            href="/interview/setup"
            className="inline-block mt-8 rounded-full bg-primary px-10 py-4 text-lg font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300"
          >
            免费开始面试 →
          </Link>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border px-4 py-8">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Probe</p>
          <p>© 2026 Probe. AI 面试教练</p>
        </div>
      </footer>
    </div>
  );
}