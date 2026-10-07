'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, tokenStore } from './api';
import type { User } from './types';

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const me = await api.get<User>('/auth/me');
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restoreSession();
    const onUnauthorized = () => setUser(null);
    window.addEventListener('r53:unauthorized', onUnauthorized);
    return () => {
      cancelled = true;
      window.removeEventListener('r53:unauthorized', onUnauthorized);
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', { username, password });
    tokenStore.set(res.token);
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Even if the server call fails, the local session is cleared below.
    }
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}