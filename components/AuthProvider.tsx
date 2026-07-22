'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { http } from '@/lib/utils/http';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAccessToken: (token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      try {
        const refreshRes = await http.post<{ accessToken: string }>('/api/auth/refresh');
        if (refreshRes.status === 200 && refreshRes.data.accessToken) {
          setAccessToken(refreshRes.data.accessToken);
          http.defaults.headers.common['Authorization'] = `Bearer ${refreshRes.data.accessToken}`;

          const meRes = await http.get<{ user: AuthUser }>('/api/auth/me');
          if (meRes.status === 200) {
            setUser(meRes.data.user);
          }
        }
      } catch {
        // No valid refresh token, user not logged in
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  async function login(email: string, password: string) {
    setError(null);
    try {
      const { data } = await http.post<{ accessToken: string; user: AuthUser }>(
        '/api/auth/login',
        { email, password }
      );

      setAccessToken(data.accessToken);
      setUser(data.user);
      http.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    }
  }

  async function logout() {
    try {
      await http.post('/api/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      delete http.defaults.headers.common['Authorization'];
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    logout,
    setAccessToken: (token) => {
      setAccessToken(token);
      http.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
