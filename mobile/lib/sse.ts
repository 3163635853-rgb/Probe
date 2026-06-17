import EventSource from "react-native-sse";
import { getToken } from "./auth";
import { fetchAPI } from "./api";
import type {
  SSEQuestionEvent,
  SSEStatusEvent,
  SSEEvaluationEvent,
  SSEReportEvent,
  SSEErrorEvent,
} from "./types";

export type SSEConnectionState =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "failed";

export interface SSEHandlers {
  onQuestion?: (data: SSEQuestionEvent) => void;
  onStatus?: (data: SSEStatusEvent) => void;
  onEvaluation?: (data: SSEEvaluationEvent) => void;
  onThinking?: (data: { content: string }) => void;
  onReport?: (data: SSEReportEvent) => void;
  onError?: (data: SSEErrorEvent) => void;
  onDone?: () => void;
  onStateChange?: (state: SSEConnectionState) => void;
}

type CustomEventNames = "question" | "status" | "evaluation" | "thinking" | "report" | "done" | "connected";

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

/**
 * 创建 SSE 连接
 * - 使用 Authorization header（不在 URL 暴露 token）
 * - 跟踪 lastEventId 支持断线续传
 * - 指数退避重连，最多 MAX_RETRIES 次
 */
export function createSSE(url: string, handlers: SSEHandlers) {
  let state: SSEConnectionState = "connecting";
  let lastEventId: string | null = null;
  let retryCount = 0;
  let es: InstanceType<typeof EventSource<CustomEventNames>> | null = null;
  let closed = false;

  function setState(s: SSEConnectionState) {
    state = s;
    handlers.onStateChange?.(s);
  }

  async function connect() {
    if (closed) return;

    // 获取一次性 ticket（30s 有效），比 token 在 URL 更安全
    let ticket: string | null = null;
    try {
      const res = await fetchAPI<{ ticket: string }>("/auth/ticket", { method: "POST" });
      ticket = res.ticket;
    } catch {
      // ticket 获取失败，回退到 header 认证
      const token = await getToken();
      if (!token) {
        setState("failed");
        return;
      }
    }

    if (closed) return;

    const headers: Record<string, string> = {};
    if (!ticket) {
      const token = await getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }
    if (lastEventId) {
      headers["Last-Event-ID"] = lastEventId;
    }

    // URL 拼接 ticket（如果有）
    const connectUrl = ticket
      ? `${url}${url.includes("?") ? "&" : "?"}ticket=${ticket}`
      : url;

    setState("connecting");
    es = new EventSource<CustomEventNames>(connectUrl, {
      headers,
      // react-native-sse 不支持自动重连，我们手动实现
    });

    es.addEventListener("open", () => {
      retryCount = 0; // 连接成功重置重试计数
      setState("connected");
    });

    es.addEventListener("connected", (event) => {
      if (event.data) {
        // 服务端确认连接，可能包含 resumed_from 信息
        lastEventId = null; // reset
      }
      setState("connected");
    });

    es.addEventListener("question", (event) => {
      if (closed || !event.data) return;
      trackEventId(event);
      try { handlers.onQuestion?.(JSON.parse(event.data)); } catch {}
    });

    es.addEventListener("status", (event) => {
      if (closed || !event.data) return;
      trackEventId(event);
      try { handlers.onStatus?.(JSON.parse(event.data)); } catch {}
    });

    es.addEventListener("evaluation", (event) => {
      if (closed || !event.data) return;
      trackEventId(event);
      try { handlers.onEvaluation?.(JSON.parse(event.data)); } catch {}
    });

    es.addEventListener("thinking", (event) => {
      if (closed || !event.data) return;
      trackEventId(event);
      try { handlers.onThinking?.(JSON.parse(event.data)); } catch {}
    });

    es.addEventListener("report", (event) => {
      if (closed || !event.data) return;
      trackEventId(event);
      try { handlers.onReport?.(JSON.parse(event.data)); } catch {}
    });

    es.addEventListener("done", () => {
      setState("closed");
      handlers.onDone?.();
      cleanup();
    });

    es.addEventListener("error", (event) => {
      if (closed) return;
      // 尝试解析服务端发的 error 事件
      const errEvent = event as { data?: string | null };
      if (errEvent.data) {
        try {
          const parsed: SSEErrorEvent = JSON.parse(errEvent.data);
          handlers.onError?.(parsed);
          if (!parsed.retry) {
            setState("failed");
            cleanup();
            return;
          }
        } catch {
          // 非 JSON，是连接层错误
        }
      }
      // 连接断开，尝试重连
      attemptReconnect();
    });
  }

  function trackEventId(event: { lastEventId?: string | null }) {
    if (event.lastEventId) {
      lastEventId = event.lastEventId;
    }
  }

  function attemptReconnect() {
    cleanup();
    if (closed) return;
    if (retryCount >= MAX_RETRIES) {
      setState("failed");
      return;
    }
    setState("reconnecting");
    const delay = BASE_DELAY_MS * Math.pow(2, retryCount);
    retryCount++;
    setTimeout(() => connect(), delay);
  }

  function cleanup() {
    es?.close();
    es = null;
  }

  // 启动连接
  connect();

  return {
    close() {
      closed = true;
      setState("closed");
      cleanup();
    },
    getState() {
      return state;
    },
  };
}
