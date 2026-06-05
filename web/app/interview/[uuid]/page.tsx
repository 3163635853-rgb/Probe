"use client";

import { useEffect, useReducer, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/AuthGuard";
import { getToken } from "@/lib/auth";
import { fetchAPI } from "@/lib/api";
import { createSSE, type SSEConnectionState } from "@/lib/sse";
import type { SSEQuestionEvent, SSEStatusEvent } from "@/lib/types";

// State
interface Message {
  id: number;
  role: "ai" | "user";
  content: string;
  typing?: boolean;
}

interface InterviewState {
  messages: Message[];
  status: SSEStatusEvent | null;
  connection: SSEConnectionState;
  thinking: boolean;
  inputDisabled: boolean;
  done: boolean;
}

type Action =
  | { type: "ADD_AI_MSG"; content: string }
  | { type: "FINISH_TYPING"; id: number }
  | { type: "ADD_USER_MSG"; content: string }
  | { type: "SET_STATUS"; data: SSEStatusEvent }
  | { type: "SET_CONNECTION"; state: SSEConnectionState }
  | { type: "SET_THINKING"; value: boolean }
  | { type: "SET_INPUT_DISABLED"; value: boolean }
  | { type: "SET_DONE" };

let msgId = 0;

function reducer(state: InterviewState, action: Action): InterviewState {
  switch (action.type) {
    case "ADD_AI_MSG":
      return {
        ...state,
        thinking: false,
        inputDisabled: false,
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
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
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
      onReport(data) {
        router.push(`/interview/${data.session_uuid}/report`);
      },
      onDone() {
        dispatch({ type: "SET_DONE" });
      },
      onError() {
        // 显示在 UI 上，不阻断
      },
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
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [state.done]);

  const sendAnswer = useCallback(async () => {
    const content = inputRef.current?.value.trim();
    if (!content) return;
    dispatch({ type: "ADD_USER_MSG", content });
    inputRef.current!.value = "";
    await fetchAPI(`/interview/${uuid}/answer`, {
      method: "POST",
      body: JSON.stringify({ content, type: "text" }),
    });
  }, [uuid]);

  const skipQuestion = useCallback(async () => {
    dispatch({ type: "SET_INPUT_DISABLED", value: true });
    await fetchAPI(`/interview/${uuid}/skip`, { method: "POST" });
  }, [uuid]);

  const endInterview = useCallback(async () => {
    if (!confirm("确定要结束面试吗？")) return;
    await fetchAPI(`/interview/${uuid}/end`, { method: "POST" });
  }, [uuid]);

  const progress = state.status?.progress || "0/10";
  const elapsed = state.status?.elapsed || 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <main className="flex flex-1 flex-col h-screen">
      {/* 顶栏 */}
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">进度 {progress}</span>
          <span className="text-sm text-muted-foreground">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <ConnectionBadge state={state.connection} />
          <button
            onClick={endInterview}
            className="rounded-lg border border-destructive px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors"
          >
            结束面试
          </button>
        </div>
      </header>

      {/* 对话区 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {state.messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} onTypingDone={() => dispatch({ type: "FINISH_TYPING", id: msg.id })} />
        ))}
        {state.thinking && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
            正在分析...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <footer className="border-t border-border p-3 sm:p-4 pb-[env(safe-area-inset-bottom,0.75rem)]">
        <div className="mx-auto max-w-3xl flex gap-2 sm:gap-3">
          <textarea
            ref={inputRef}
            disabled={state.inputDisabled}
            placeholder={state.done ? "面试已结束" : "输入你的回答..."}
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border p-3 text-base focus:outline-none focus:border-primary disabled:opacity-50"
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
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 min-h-[44px]"
            >
              发送
            </button>
            <button
              onClick={skipQuestion}
              disabled={state.inputDisabled}
              className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors disabled:opacity-50 min-h-[44px]"
            >
              跳过
            </button>
          </div>
        </div>
      </footer>
    </main>
  );
}

// 对话气泡
function ChatBubble({ message, onTypingDone }: { message: Message; onTypingDone: () => void }) {
  const isAi = message.role === "ai";

  useEffect(() => {
    if (message.typing) {
      const timer = setTimeout(onTypingDone, message.content.length * 30 + 500);
      return () => clearTimeout(timer);
    }
  }, [message.typing, message.content.length, onTypingDone]);

  return (
    <div className={`flex ${isAi ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isAi
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {isAi && message.typing ? (
          <TypeWriter text={message.content} />
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
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

  return <p className="whitespace-pre-wrap">{displayed}<span className="animate-pulse">|</span></p>;
}

// 连接状态标记
function ConnectionBadge({ state }: { state: SSEConnectionState }) {
  const config = {
    connecting: { color: "bg-yellow-400", label: "连接中" },
    connected: { color: "bg-success", label: "已连接" },
    reconnecting: { color: "bg-yellow-400", label: "重连中" },
    closed: { color: "bg-muted-foreground", label: "已断开" },
  };
  const { color, label } = config[state];

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}
