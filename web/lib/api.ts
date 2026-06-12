import { getToken, setToken, clearToken } from "./auth";
import type { ApiResponse } from "./types";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  code: number;
  detail?: string;

  constructor(code: number, message: string, detail?: string) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

export async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Token 自动续签
  const newToken = res.headers.get("X-New-Token");
  if (newToken) {
    setToken(newToken);
  }

  // 401 → 跳登录
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError(40001, "登录已过期，请重新登录");
  }

  // 非 2xx 状态码处理
  if (!res.ok) {
    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new ApiError(res.status, `请求失败 (${res.status})`);
    }
    const message = json.message || json.detail || `请求失败 (${res.status})`;
    throw new ApiError(json.code || res.status, message, json.detail);
  }

  const json: ApiResponse<T> = await res.json();

  if (json.code !== 0) {
    throw new ApiError(json.code, json.message, (json as any).detail);
  }

  return json.data;
}
