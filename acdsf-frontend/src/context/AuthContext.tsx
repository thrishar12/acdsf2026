import { createContext, useContext, useMemo, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { RoleId, User } from '../types';
import { getStoredToken, setStoredToken, removeStoredToken } from '../utils/token';

const SESSION_KEY = 'acdsf.session';
const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string, confirmPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Decode JWT without a library (safe — we only read claims, don't verify)
function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const claims = decodeJwt(token);
  if (!claims || typeof claims.exp !== 'number') return true;
  return Date.now() / 1000 > claims.exp;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    const stored = getStoredToken();
    if (stored && isTokenExpired(stored)) {
      removeStoredToken();
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return stored;
  });

  const [isLoading, setIsLoading] = useState(false);

  // Auto-logout when token expires
  useEffect(() => {
    if (!token) return;
    const claims = decodeJwt(token);
    if (!claims?.exp || typeof claims.exp !== 'number') return;
    const msUntilExpiry = claims.exp * 1000 - Date.now();
    if (msUntilExpiry <= 0) {
      _doLogout();
      return;
    }
    const timer = setTimeout(() => {
      _doLogout();
    }, msUntilExpiry);
    return () => clearTimeout(timer);
  }, [token]);

  function _doLogout() {
    removeStoredToken();
    localStorage.removeItem(SESSION_KEY);
    setToken(null);
    setUser(null);
  }

  function _persistSession(jwt: string, userData: User) {
    setStoredToken(jwt);
    localStorage.setItem(SESSION_KEY, JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  }

  // ── login ────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string) => {
    if (!email.trim() || !password) throw new Error('Email and password are required.');

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();

      if (!res.ok) {
        // Bubble exact backend message (rate limit, wrong creds, etc.)
        throw new Error(body?.error || 'Authentication failed.');
      }

      const jwt = body.token;
      const userData = body.user;
      if (!jwt) throw new Error('Server did not return an authentication token.');

      const sessionUser: User = {
        email: userData?.email || email.toLowerCase(),
        name: userData?.full_name || userData?.username || email.split('@')[0],
        role: (userData?.role || 'analyst') as RoleId,
      };

      _persistSession(jwt, sessionUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── signup ───────────────────────────────────────────────────────────────
  const signup = useCallback(async (
    fullName: string,
    email: string,
    password: string,
    confirmPassword: string,
  ) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter a valid email address.');
    if (!fullName.trim()) throw new Error('Full name is required.');
    if (password !== confirmPassword) throw new Error('Passwords do not match.');
    if (password.length < 8) throw new Error('Password must be at least 8 characters.');

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          confirm_password: confirmPassword,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error || 'Registration failed.');
      }

      const jwt = body.token;
      const userData = body.user;

      const sessionUser: User = {
        email: userData?.email || email.toLowerCase(),
        name: userData?.full_name || fullName,
        role: (userData?.role || 'analyst') as RoleId,
      };

      _persistSession(jwt, sessionUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── logout ───────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    const currentToken = getStoredToken();
    _doLogout();
    // Best-effort server-side blacklist
    if (currentToken) {
      try {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${currentToken}` },
        });
      } catch {
        // Ignore network errors on logout
      }
    }
  }, []);

  // ── refreshUser ──────────────────────────────────────────────────────────
  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.status === 401) {
        _doLogout();
        return;
      }
      if (res.ok) {
        const body = await res.json();
        const u = body.user;
        const updated: User = {
          email: u.email,
          name: u.full_name || u.username,
          role: u.role as RoleId,
        };
        setUser(updated);
        localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
      }
    } catch {
      // Ignore network errors on refresh
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isLoading, login, signup, logout, refreshUser }),
    [user, token, isLoading, login, signup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
