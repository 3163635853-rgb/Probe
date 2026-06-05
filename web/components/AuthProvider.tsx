"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getToken, setToken, clearToken, isLoggedIn } from "@/lib/auth";
import { fetchAPI } from "@/lib/api";
import type { User, LoginResponse } from "@/lib/types";

interface AuthState {
  user: User | null;
  loading: boolean;
  logged: boolean;
}

interface AuthContextValue extends AuthState {
  login: (token: string, user: LoginResponse["user"]) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    logged: false,
  });

  const refreshUser = useCallback(async () => {
    if (!isLoggedIn()) {
      setState({ user: null, loading: false, logged: false });
      return;
    }
    try {
      const user = await fetchAPI<User>("/auth/me");
      setState({ user, loading: false, logged: true });
    } catch {
      clearToken();
      setState({ user: null, loading: false, logged: false });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((token: string, user: LoginResponse["user"]) => {
    setToken(token);
    setState({
      user: { ...user, phone: null, quota_remaining: 0, total_interviews: 0, created_at: "" } as User,
      loading: false,
      logged: true,
    });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setState({ user: null, loading: false, logged: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
