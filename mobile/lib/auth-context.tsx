import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus } from "react-native";
import { getToken, setToken, clearToken } from "@/lib/auth";
import { fetchAPI, setOnUnauthorized } from "@/lib/api";
import type { User, LoginResponse } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nickname?: string) => Promise<void>;
  loginWithWechat: (code: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginWithWechat: async () => {},
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const appState = useRef(AppState.currentState);

  // 验证 token 有效性
  const validateToken = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      return false;
    }
    try {
      const u = await fetchAPI<User>("/auth/me");
      setUser(u);
      void fetchAPI("/invite/retry-reward", { method: "POST" }).catch(() => undefined);
      return true;
    } catch {
      await clearToken();
      setUser(null);
      return false;
    }
  }, []);

  // 启动时检查
  useEffect(() => {
    void Promise.resolve().then(validateToken).finally(() => setLoading(false));
    // 注册 401 回调：api 层 401 时清除用户状态触发 AuthGuard 跳转登录
    setOnUnauthorized(() => setUser(null));
    return () => setOnUnauthorized(null);
  }, [validateToken]);

  // App 从后台回前台时重新验证 token
  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === "active" &&
        user
      ) {
        validateToken();
      }
      appState.current = nextState;
    }
    const sub = AppState.addEventListener("change", handleAppStateChange);
    return () => sub.remove();
  }, [user, validateToken]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetchAPI<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    await setToken(res.token);
    // 登录响应已包含基础用户信息，立即设置避免二次请求
    // validateToken 会在 AppState 回前台时拉取完整 User
    const u = await fetchAPI<User>("/auth/me");
    setUser(u);
  }, []);

  const register = useCallback(async (email: string, password: string, nickname?: string) => {
    const res = await fetchAPI<LoginResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, nickname }),
    });
    await setToken(res.token);
    const u = await fetchAPI<User>("/auth/me");
    setUser(u);
  }, []);

  const loginWithWechat = useCallback(async (code: string) => {
    const res = await fetchAPI<LoginResponse>("/auth/wechat", {
      method: "POST",
      body: JSON.stringify({ code, channel: "mobile" }),
    });
    await setToken(res.token);
    const u = await fetchAPI<User>("/auth/me");
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithWechat, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
