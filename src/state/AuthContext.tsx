import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, clearStoredToken, getStoredToken, setStoredToken, setUnauthorizedHandler } from '../api/client';
import type { User } from '../types';

type AuthState = {
  user: User | null;
  initializing: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const navigate = useNavigate();

  const expireSession = useCallback(() => {
    clearStoredToken();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  useEffect(() => {
    setUnauthorizedHandler(expireSession);
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      const token = getStoredToken();
      if (!token) {
        setInitializing(false);
        return;
      }
      try {
        const me = await api.me();
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        if (!cancelled) {
          clearStoredToken();
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }
    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const response = await api.login(username, password);
    setStoredToken(response.access_token);
    const me = await api.me();
    setUser(me);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearStoredToken();
      setUser(null);
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const value = useMemo(() => ({ user, initializing, login, logout }), [user, initializing, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
