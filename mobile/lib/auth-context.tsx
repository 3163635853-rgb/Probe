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
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
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
      return true;
    } catch {
      await clearToken();
      setUser(null);
      return false;
    }
  }, []);

  // 启动时检查
  useEffect(() => {
    validateToken().finally(() => setLoading(false));
    // 注册 401 回调：api 层 401 时清除用户状态触发 AuthGuard 跳转登录
    setOnUnauthorized(() => setUser(null));
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
    const u = await fetchAPI<User>("/auth/me");
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
