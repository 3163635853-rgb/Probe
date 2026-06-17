import { getToken, setToken, clearToken } from "./auth";
import type { ApiResponse } from "./types";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api.probe.app";
const APP_VERSION = Constants.expoConfig?.version || "1.0.0";

// 401 回调：由 auth-context 注册，解耦 api 层和 router
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export class ApiError extends Error {
  code: number;
  detail?: string;

  constructor(code: number, message: string, detail?: string) {
    super(message);
    this.code = code;
    this.detail = detail;
  }
}

/**
 * 统一 API 请求函数
 * - 自动携带 Authorization header
 * - 自动携带 App 标识 headers (X-Platform, X-App-Version, X-Device-Id)
 * - 自动处理 token 续签 (X-New-Token)
 * - 401 自动跳转登录
 */
export async function fetchAPI<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Platform": Platform.OS,
    "X-App-Version": APP_VERSION,
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // 移除 Content-Type 当 body 是 FormData（multipart upload）
  if (options.body instanceof FormData) {
    delete headers["Content-Type"];
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Token 自动续签
  const newToken = res.headers.get("X-New-Token");
  if (newToken) {
    await setToken(newToken);
  }

  // 401 → 清 token + 回调通知
  if (res.status === 401) {
    await clearToken();
    onUnauthorized?.();
    throw new ApiError(40001, "登录已过期，请重新登录");
  }

  if (!res.ok) {
    let body: { code?: number; message?: string; detail?: string } = {};
    try {
      body = await res.json();
    } catch {
      throw new ApiError(res.status, `请求失败 (${res.status})`);
    }
    // 不暴露 detail 给用户，仅用 message
    throw new ApiError(
      body.code || res.status,
      body.message || `请求失败 (${res.status})`
    );
  }

  const json: ApiResponse<T> = await res.json();
  if (json.code !== 0) {
    throw new ApiError(json.code, json.message);
  }
  return json.data;
}

/**
 * 上传文件的专用方法（走统一 fetchAPI 链路）
 */
export async function uploadFile<T>(
  path: string,
  formData: FormData
): Promise<T> {
  return fetchAPI<T>(path, {
    method: "POST",
    body: formData,
    headers: {}, // Content-Type 会在 fetchAPI 中自动删除
  });
}
