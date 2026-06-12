"use client";

import { useEffect, useReducer, useRef, useCallback, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/AuthGuard";
import { getToken } from "@/lib/auth";
import { fetchAPI } from "@/lib/api";
import { createSSE, type SSEConnectionState } from "@/lib/sse";
import type { SSEQuestionEvent, SSEStatusEvent } from "@/lib/types";
import { Brain, Send, SkipForward, X, Wifi, WifiOff } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackModal";
import { useToast } from "@/components/Toast";

// State
interface Message {
  id: number;
  role: "ai" | "user";
  content: string;
  typing?: boolean;
  score?: number;
}

interface InterviewState {
  messages: Message[];
  status: SSEStatusEvent | null;
  connection: SSEConnectionState;
  thinking: boolean;
  inputDisabled: boolean;
  done: boolean;
  lastScore: { round: number; score: number; brief: string } | null;
}

type Action =
  | { type: "ADD_AI_MSG"; content: string }
  | { type: "FINISH_TYPING"; id: number }
  | { type: "ADD_USER_MSG"; content: string }
  | { type: "SET_STATUS"; data: SSEStatusEvent }
  | { type: "SET_CONNECTION"; state: SSEConnectionState }
  | { type: "SET_THINKING"; value: boolean }
  | { type: "SET_INPUT_DISABLED"; value: boolean }
  | { type: "SET_DONE" }
  | { type: "SET_SCORE"; data: { round: number; score: number; brief: string } };

let msgId = 0;

function reducer(state: InterviewState, action: Action): InterviewState {
  switch (action.type) {
    case "ADD_AI_MSG":
      return {
        ...state,
        thinking: false,
        inputDisabled: false,
        lastScore: null,
        messages: [...state.messages, { id: ++msgId, role: "ai", content: action.content, typing: true }],
      };
    case "FINISH_TYPING":
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.id === action.id ? { ...m, typing: false } : m
        ),
      };
    case "ADD_USER_MSG":
      return {
        ...state,
        inputDisabled: true,
        messages: [...state.messages, { id: ++msgId, role: "user", content: action.content }],
      };
    case "SET_STATUS":
      return { ...state, status: action.data };
    case "SET_CONNECTION":
      return { ...state, connection: action.state };
    case "SET_THINKING":
      return { ...state, thinking: action.value };
    case "SET_INPUT_DISABLED":
      return { ...state, inputDisabled: action.value };
    case "SET_DONE":
      return { ...state, done: true, inputDisabled: true };
    case "SET_SCORE":
      return { ...state, lastScore: action.data };
    default:
      return state;
  }
}

const INITIAL_STATE: InterviewState = {
  messages: [],
  status: null,
  connection: "connecting",
  thinking: false,
  inputDisabled: true,
  done: false,
  lastScore: null,
};

export default function InterviewPage() {
  return (
    <AuthGuard>
      <InterviewSession />
    </AuthGuard>
  );
}

function InterviewSession() {
  const { uuid } = useParams<{ uuid: string }>();
  const router = useRouter();
  const toast = useToast();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [showFeedback, setShowFeedback] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const reportUrlRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<ReturnType<typeof createSSE> | null>(null);

  // SSE 连接
  useEffect(() => {
    const token = getToken();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
    const url = `${baseUrl}/interview/${uuid}/stream?token=${token}`;

    sseRef.current = createSSE(url, {
      onQuestion(data: SSEQuestionEvent) {
        dispatch({ type: "ADD_AI_MSG", content: data.content });
      },
      onStatus(data: SSEStatusEvent) {
        dispatch({ type: "SET_STATUS", data });
      },
      onThinking() {
        dispatch({ type: "SET_THINKING", value: true });
      },
      onEvaluation(data: { round: number; score: number; brief: string }) {
        dispatch({ type: "SET_SCORE", data });
      },
      onReport(data) {
        reportUrlRef.current = `/interview/${data.session_uuid}/report`;
        setShowFeedback(true);
      },
      onDone() {
        dispatch({ type: "SET_DONE" });
        if (!reportUrlRef.current) {
          reportUrlRef.current = `/interview/${uuid}/report`;
          setShowFeedback(true);
        }
      },
      onError() {},
      onStateChange(s) {
        dispatch({ type: "SET_CONNECTION", state: s });
      },
    });

    return () => sseRef.current?.close();
  }, [uuid, router]);

  // 自动滚动
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages, state.thinking]);

  // 页面离开提示
  useEffect(() => {
    if (state.done) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.done]);

  const sendAnswer = useCallback(async () => {
    const content = inputRef.current?.value.trim();
    if (!content) return;
    dispatch({ type: "ADD_USER_MSG", content });
    if (inputRef.current) inputRef.current.value = "";
    try {
      await fetchAPI(`/interview/${uuid}/answer`, {
        method: "POST",
        body: JSON.stringify({ content, type: "text" }),
      });
    } catch (e: any) {
      toast.error(e.message || "发送失败，请重试");
    }
  }, [uuid, toast]);

  const skipQuestion = useCallback(async () => {
    dispatch({ type: "SET_INPUT_DISABLED", value: true });
    try {
      await fetchAPI(`/interview/${uuid}/skip`, { method: "POST" });
    } catch (e: any) {
      dispatch({ type: "SET_INPUT_DISABLED", value: false });
      toast.error(e.message || "跳过失败");
    }
  }, [uuid, toast]);

  const endInterview = useCallback(async () => {
    if (!confirmEnd) {
      setConfirmEnd(true);
      toast.warning("再次点击确认结束面试");
      setTimeout(() => setConfirmEnd(false), 3000);
      return;
    }
    try {
      await fetchAPI(`/interview/${uuid}/end`, { method: "POST" });
      toast.info("面试正在结束...");
    } catch (e: any) {
      toast.error(e.message || "结束面试失败");
    }
  }, [uuid, confirmEnd, toast]);

  const progress = state.status?.progress || "0/10";
  const [current, total] = progress.split("/").map(Number);
  const elapsed = state.status?.elapsed || 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <main className="flex flex-1 flex-col h-screen bg-background">
      {/* 顶栏 */}
      <header className="flex items-center justify-between border-b border-border px-4 sm:px-6 py-3 bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-5">
          {/* 环形进度 */}
          <ProgressRing current={current} total={total} />
          <div className="flex flex-col">
            <span className="text-sm font-medium">第 {current}/{total} 题</span>
            <span className="text-xs text-muted-foreground">
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge state={state.connection} />
          {state.done ? (
            <Link
              href="/interview/setup"
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary transition-colors"
            >
              返回
            </Link>
          ) : (
            <button
              onClick={endInterview}
              className={`group rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                confirmEnd
                  ? "border-destructive bg-destructive text-destructive-foreground"
                  : "border-border text-muted-foreground hover:border-destructive hover:text-destructive"
              }`}
            >
              <X className="w-4 h-4 inline mr-1" />{confirmEnd ? "确认结束" : "结束"}
            </button>
          )}
        </div>
      </header>

      {/* 评分浮层 */}
      {state.lastScore && <ScoreToast score={state.lastScore} />}

      {/* 对话区 */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-5">
        {state.messages.length === 0 && !state.thinking && state.connection === "closed" && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <p className="text-muted-foreground">连接已断开，面试未能开始</p>
            <Link href="/interview/setup" className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover transition-colors">
              返回重试
            </Link>
          </div>
        )}
        {state.messages.length === 0 && state.connection !== "closed" && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div className="h-8 w-8 mx-auto animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">等待面试官出题...</p>
            </div>
          </div>
        )}
        {state.messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} onTypingDone={() => dispatch({ type: "FINISH_TYPING", id: msg.id })} />
        ))}
        {state.thinking && <ThinkingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <footer className="border-t border-border bg-card/80 backdrop-blur-sm p-3 sm:p-4 pb-[env(safe-area-inset-bottom,0.75rem)]">
        <div className="mx-auto max-w-3xl flex gap-2 sm:gap-3 items-end">
          <textarea
            ref={inputRef}
            disabled={state.inputDisabled}
            placeholder={state.done ? "面试已结束" : "输入你的回答... (Enter 发送，Shift+Enter 换行)"}
            rows={2}
            className="flex-1 resize-none rounded-xl border border-border bg-background p-3 text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50 transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendAnswer();
              }
            }}
          />
          <div className="flex flex-col gap-2">
            <button
              onClick={sendAnswer}
              disabled={state.inputDisabled}
              className="rounded-xl bg-primary p-3 text-primary-foreground hover:bg-primary-hover transition-colors disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="发送"
            >
              <Send className="w-5 h-5" />
            </button>
            <button
              onClick={skipQuestion}
              disabled={state.inputDisabled}
              className="rounded-xl border border-border p-3 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="跳过"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>
        </div>
      </footer>

      {/* 评分弹窗 */}
      {showFeedback && (
        <FeedbackModal
          sessionUuid={uuid}
          onClose={() => {
            setShowFeedback(false);
            if (reportUrlRef.current) router.push(reportUrlRef.current);
          }}
        />
      )}
    </main>
  );
}

// 环形进度
function ProgressRing({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? (current / total) * 100 : 0;
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="currentColor" className="text-border" strokeWidth="3" />
        <circle
          cx="22" cy="22" r={r} fill="none" stroke="currentColor" className="text-primary"
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-bold">{current}</span>
    </div>
  );
}

// 评分浮层
function ScoreToast({ score }: { score: { round: number; score: number; brief: string } }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(t);
  }, [score]);

  if (!visible) return null;

  const color = score.score >= 7 ? "text-success border-success/20 bg-success/5" :
    score.score >= 5 ? "text-primary border-primary/20 bg-primary/5" :
    "text-destructive border-destructive/20 bg-destructive/5";

  return (
    <div className={`absolute top-16 right-4 z-40 animate-slide-in-right rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm ${color}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl font-bold">{score.score}/10</span>
        <span className="text-xs max-w-[160px] leading-tight opacity-80">{score.brief}</span>
      </div>
    </div>
  );
}

// 思考动画 — 三个跳动的点
function ThinkingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Brain className="w-4 h-4 text-primary" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// 对话气泡 — 带头像
function ChatBubble({ message, onTypingDone }: { message: Message; onTypingDone: () => void }) {
  const isAi = message.role === "ai";

  useEffect(() => {
    if (message.typing) {
      const timer = setTimeout(onTypingDone, message.content.length * 30 + 500);
      return () => clearTimeout(timer);
    }
  }, [message.typing, message.content.length, onTypingDone]);

  return (
    <div className={`flex items-start gap-3 ${isAi ? "justify-start" : "justify-end"}`}>
      {isAi && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
          <Brain className="w-4 h-4 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
          isAi
            ? "rounded-tl-sm bg-muted text-foreground"
            : "rounded-tr-sm bg-primary text-primary-foreground"
        }`}
      >
        {isAi && message.typing ? (
          <TypeWriter text={message.content} />
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        )}
      </div>
    </div>
  );
}

// 打字机效果
function TypeWriter({ text }: { text: string }) {
  const [displayed, setDisplayed] = useReducer(
    (_: string, action: string) => action,
    ""
  );

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  return <p className="whitespace-pre-wrap leading-relaxed">{displayed}<span className="animate-pulse text-primary">|</span></p>;
}

// 连接状态标记
function ConnectionBadge({ state }: { state: SSEConnectionState }) {
  const config = {
    connecting: { icon: Wifi, color: "text-yellow-500", label: "连接中" },
    connected: { icon: Wifi, color: "text-success", label: "已连接" },
    reconnecting: { icon: Wifi, color: "text-yellow-500", label: "重连中" },
    closed: { icon: WifiOff, color: "text-muted-foreground", label: "已断开" },
  };
  const { icon: Icon, color, label } = config[state];

  return (
    <span className={`flex items-center gap-1.5 text-xs ${color}`}>
      <Icon className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
