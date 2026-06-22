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
  | "closed";

export interface SSEConnectedEvent {
  session_uuid: string;
  resumed_from: number;
}

export interface SSEHandlers {
  onConnected?: (data: SSEConnectedEvent) => void;
  onQuestion?: (data: SSEQuestionEvent) => void;
  onStatus?: (data: SSEStatusEvent) => void;
  onEvaluation?: (data: SSEEvaluationEvent) => void;
  onThinking?: (data: { content: string }) => void;
  onReport?: (data: SSEReportEvent) => void;
  onReminder?: (data: { message: string }) => void;
  onError?: (data: SSEErrorEvent) => void;
  onDone?: () => void;
  onStateChange?: (state: SSEConnectionState) => void;
}

/**
 * 创建 SSE 连接。
 * 利用浏览器 EventSource 原生自动重连机制：
 * - 服务端每条消息带 id 字段
 * - 断线后浏览器自动重连并发送 Last-Event-ID header
 * - 服务端从该 id 之后恢复推送
 */
export function createSSE(url: string, handlers: SSEHandlers) {
  let eventSource: EventSource | null = null;
  let state: SSEConnectionState = "connecting";

  function setState(s: SSEConnectionState) {
    state = s;
    handlers.onStateChange?.(s);
  }

  eventSource = new EventSource(url);

  eventSource.onopen = () => {
    setState("connected");
  };

  function safeParse(data: string): any {
    try { return JSON.parse(data); } catch { return null; }
  }

  // 服务端推送的 connected 事件（含 session_uuid 和 resumed_from）
  eventSource.addEventListener("connected", (e) => {
    setState("connected");
    const d = safeParse(e.data); if (d) handlers.onConnected?.(d);
  });

  eventSource.addEventListener("question", (e) => {
    const d = safeParse(e.data); if (d) handlers.onQuestion?.(d);
  });

  eventSource.addEventListener("status", (e) => {
    const d = safeParse(e.data); if (d) handlers.onStatus?.(d);
  });

  eventSource.addEventListener("evaluation", (e) => {
    const d = safeParse(e.data); if (d) handlers.onEvaluation?.(d);
  });

  eventSource.addEventListener("thinking", (e) => {
    const d = safeParse(e.data); if (d) handlers.onThinking?.(d);
  });

  eventSource.addEventListener("report", (e) => {
    const d = safeParse(e.data); if (d) handlers.onReport?.(d);
  });

  eventSource.addEventListener("reminder", (e) => {
    const d = safeParse(e.data); if (d) handlers.onReminder?.(d);
  });

  eventSource.addEventListener("error", (e) => {
    const me = e as MessageEvent;
    if (!me.data) return;
    const d = safeParse(me.data); if (d) handlers.onError?.(d);
  });

  eventSource.addEventListener("done", () => {
    setState("closed");
    handlers.onDone?.();
    eventSource?.close();
  });

  // 连接错误 — EventSource 会自动重连并带上 Last-Event-ID header
  eventSource.onerror = () => {
    if (state === "closed") return;
    setState("reconnecting");
    // 浏览器 EventSource 会自动尝试重连，无需手动处理
  };

  return {
    close() {
      setState("closed");
      eventSource?.close();
    },
    getState() {
      return state;
    },
  };
}
