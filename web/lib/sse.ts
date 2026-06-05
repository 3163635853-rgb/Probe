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

export function createSSE(url: string, handlers: SSEHandlers) {
  let eventSource: EventSource | null = null;
  let lastEventId = "";
  let state: SSEConnectionState = "connecting";

  function setState(s: SSEConnectionState) {
    state = s;
    handlers.onStateChange?.(s);
  }

  function connect() {
    const connectUrl = lastEventId
      ? `${url}${url.includes("?") ? "&" : "?"}lastEventId=${lastEventId}`
      : url;

    eventSource = new EventSource(connectUrl);
    setState(lastEventId ? "reconnecting" : "connecting");

    eventSource.onopen = () => setState("connected");

    eventSource.addEventListener("question", (e) => {
      lastEventId = e.lastEventId;
      handlers.onQuestion?.(JSON.parse(e.data));
    });

    eventSource.addEventListener("status", (e) => {
      lastEventId = e.lastEventId;
      handlers.onStatus?.(JSON.parse(e.data));
    });

    eventSource.addEventListener("evaluation", (e) => {
      lastEventId = e.lastEventId;
      handlers.onEvaluation?.(JSON.parse(e.data));
    });

    eventSource.addEventListener("thinking", (e) => {
      lastEventId = e.lastEventId;
      handlers.onThinking?.(JSON.parse(e.data));
    });

    eventSource.addEventListener("report", (e) => {
      lastEventId = e.lastEventId;
      handlers.onReport?.(JSON.parse(e.data));
    });

    eventSource.addEventListener("error", (e) => {
      // SSE spec: error event with no data = connection error
      if (!(e as MessageEvent).data) return;
      lastEventId = (e as MessageEvent).lastEventId;
      handlers.onError?.(JSON.parse((e as MessageEvent).data));
    });

    eventSource.addEventListener("done", () => {
      setState("closed");
      handlers.onDone?.();
      eventSource?.close();
    });

    eventSource.onerror = () => {
      if (state === "closed") return;
      setState("reconnecting");
      eventSource?.close();
      // 自动重连 (3s 延迟)
      setTimeout(connect, 3000);
    };
  }

  connect();

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
