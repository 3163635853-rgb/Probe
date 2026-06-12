"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { fetchAPI } from "@/lib/api";
import { useToast } from "@/components/Toast";
import { AuthGuard } from "@/components/AuthGuard";
import type {
  Industry,
  Position,
  InterviewMode,
  Difficulty,
  QuotaStatus,
  StartInterviewResponse,
  ActiveInterview,
} from "@/lib/types";

type Step = "industry" | "position" | "mode" | "difficulty" | "jd" | "confirm";
const STEPS: Step[] = ["industry", "position", "mode", "difficulty", "jd", "confirm"];

export default function SetupPage() {
  return (
    <AuthGuard>
      <SetupFlow />
    </AuthGuard>
  );
}

function SetupFlow() {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<Step>("industry");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 选择状态
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [modes, setModes] = useState<InterviewMode[]>([]);
  const [difficulties, setDifficulties] = useState<Difficulty[]>([]);
  const [quota, setQuota] = useState<QuotaStatus | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveInterview | null>(null);

  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [selectedMode, setSelectedMode] = useState<InterviewMode | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<Difficulty | null>(null);
  const [jdText, setJdText] = useState("");

  // 初始化：检查活跃面试 + 加载行业 + 配额
  useEffect(() => {
    async function init() {
      const [industriesData, quotaData, active] = await Promise.all([
        fetchAPI<Industry[]>("/config/industries"),
        fetchAPI<QuotaStatus>("/quota/status"),
        fetchAPI<ActiveInterview | null>("/interview/active"),
      ]);
      setIndustries(industriesData);
      setQuota(quotaData);
      setActiveSession(active);
    }
    init().catch(() => {});
  }, [router]);

  // 选行业后加载岗位
  async function selectIndustry(ind: Industry) {
    setSelectedIndustry(ind);
    setSelectedPosition(null);
    try {
      const data = await fetchAPI<Position[]>(`/config/positions?industry_id=${ind.id}`);
      setPositions(data);
      setStep("position");
    } catch (e: any) {
      toast.error(e.message || "加载岗位失败");
    }
  }

  // 选岗位后加载模式
  async function selectPosition(pos: Position) {
    setSelectedPosition(pos);
    try {
      const data = await fetchAPI<InterviewMode[]>(`/config/modes?category=${pos.category}`);
      setModes(data);
      setStep("mode");
    } catch (e: any) {
      toast.error(e.message || "加载模式失败");
    }
  }

  // 选模式后加载难度
  async function selectMode(mode: InterviewMode) {
    setSelectedMode(mode);
    try {
      const data = await fetchAPI<Difficulty[]>("/config/difficulties");
      setDifficulties(data);
      setStep("difficulty");
    } catch (e: any) {
      toast.error(e.message || "加载难度失败");
    }
  }

  function selectDifficulty(diff: Difficulty) {
    setSelectedDifficulty(diff);
    setStep("jd");
  }

  function skipJd() {
    setStep("confirm");
  }

  async function startInterview() {
    if (!selectedIndustry || !selectedPosition || !selectedMode || !selectedDifficulty) return;
    setLoading(true);
    setError("");
    try {
      const data = await fetchAPI<StartInterviewResponse>("/interview/start", {
        method: "POST",
        body: JSON.stringify({
          industry_id: selectedIndustry.id,
          position_id: selectedPosition.id,
          mode: selectedMode.code,
          difficulty: selectedDifficulty.level,
          jd_text: jdText || undefined,
        }),
      });
      router.push(`/interview/${data.session_uuid}`);
    } catch (e: any) {
      toast.error(e.message || "创建面试失败");
    } finally {
      setLoading(false);
    }
  }

  const stepIndex = STEPS.indexOf(step);

  return (
    <main className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        {/* 进度 */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full ${
                i <= stepIndex ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        {/* 活跃面试提示 */}
        {activeSession && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-medium">你有一场正在进行的面试</p>
            <div className="flex gap-2">
              <Link
                href={`/interview/${activeSession.session_uuid}`}
                className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                继续面试
              </Link>
              <button
                onClick={async () => {
                  try {
                    await fetchAPI(`/interview/${activeSession.session_uuid}/end`, { method: "POST" });
                  } catch {}
                  setActiveSession(null);
                }}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                放弃并新建
              </button>
            </div>
          </div>
        )}

        {/* 配额提示 */}
        {quota && !quota.can_start_interview && (
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive flex items-center justify-between">
            <span>本月免费次数已用完（{quota.quota_used}/{quota.quota_total}）</span>
            <Link href="/pricing" className="font-medium underline underline-offset-2 hover:no-underline">升级套餐</Link>
          </div>
        )}
        {quota && quota.can_start_interview && (
          <p className="text-sm text-muted-foreground">
            本月剩余 {quota.quota_remaining} 次面试
          </p>
        )}

        {/* 步骤内容 */}
        {step === "industry" && (
          <StepCard title="选择行业">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {industries.map((ind) => (
                <button
                  key={ind.id}
                  onClick={() => selectIndustry(ind)}
                  className="rounded-xl border border-border p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <span className="text-2xl">{ind.icon}</span>
                  <p className="mt-2 font-medium">{ind.name}</p>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === "position" && (
          <StepCard title={`${selectedIndustry?.name} · 选择岗位`} onBack={() => setStep("industry")}>
            <div className="space-y-2">
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => selectPosition(pos)}
                  className="w-full rounded-lg border border-border p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p className="font-medium">{pos.name}</p>
                  <p className="text-sm text-muted-foreground">{pos.level}</p>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === "mode" && (
          <StepCard title="选择面试模式" onBack={() => setStep("position")}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {modes.map((m) => (
                <button
                  key={m.code}
                  onClick={() => selectMode(m)}
                  className="rounded-xl border border-border p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p className="font-medium">{m.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    约 {m.default_rounds} 题 · {m.default_duration_min} 分钟
                  </p>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === "difficulty" && (
          <StepCard title="选择难度" onBack={() => setStep("mode")}>
            <div className="space-y-2">
              {difficulties.map((d) => (
                <button
                  key={d.level}
                  onClick={() => selectDifficulty(d)}
                  className="w-full rounded-lg border border-border p-4 text-left hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <p className="font-medium">{d.name}</p>
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                </button>
              ))}
            </div>
          </StepCard>
        )}

        {step === "jd" && (
          <StepCard title="粘贴 JD（可选）" onBack={() => setStep("difficulty")}>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="粘贴职位描述，AI 会针对 JD 定制面试题..."
              className="w-full rounded-lg border border-border p-4 h-40 resize-none focus:outline-none focus:border-primary"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={skipJd}
                className="flex-1 rounded-full border border-border py-3 font-medium hover:bg-muted transition-colors"
              >
                跳过
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 rounded-full bg-primary py-3 text-white font-medium hover:bg-primary-hover transition-colors"
              >
                下一步
              </button>
            </div>
          </StepCard>
        )}

        {step === "confirm" && (
          <StepCard title="确认开始" onBack={() => setStep("jd")}>
            <div className="space-y-3 text-sm">
              <p><span className="text-muted-foreground">行业：</span>{selectedIndustry?.name}</p>
              <p><span className="text-muted-foreground">岗位：</span>{selectedPosition?.name}</p>
              <p><span className="text-muted-foreground">模式：</span>{selectedMode?.name}</p>
              <p><span className="text-muted-foreground">难度：</span>{selectedDifficulty?.name}</p>
              {jdText && <p><span className="text-muted-foreground">JD：</span>已填写</p>}
            </div>
            <button
              onClick={startInterview}
              disabled={loading || (quota !== null && !quota.can_start_interview)}
              className="mt-6 w-full rounded-full bg-primary py-3 text-white font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {loading ? "创建中..." : "开始面试"}
            </button>
            {error && <p className="mt-3 text-sm text-destructive text-center">{error}</p>}
          </StepCard>
        )}
      </div>
    </main>
  );
}

function StepCard({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {onBack && (
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground">
            ← 返回
          </button>
        )}
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      {children}
    </div>
  );
}