import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.js';
import { supabase } from '../lib/supabase.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  register: (data: {
    name: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setAuthSession: (user: User, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('mdm_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('mdm_token') || null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          localStorage.setItem('mdm_user', JSON.stringify(data.user));
        } else {
          // If server session check returned null, check if we have active supabase session
          const { data: sbData } = await supabase.auth.getSession();
          if (sbData?.session?.user) {
            const email = sbData.session.user.email!.toLowerCase();
            const isAdmin = ['admin@gmail.com', 'admin@gmai.com', 'antoniethantonio@gmail.com'].includes(email);
            const recoveredUser: User = {
              id: sbData.session.user.id,
              name: sbData.session.user.user_metadata?.name || (isAdmin ? 'Administradora Oficial' : 'Cliente Mocinhas'),
              email,
              phone: sbData.session.user.user_metadata?.phone || '+244 923 000 000',
              role: isAdmin ? 'admin' : 'client',
              createdAt: sbData.session.user.created_at || new Date().toISOString(),
            };
            setUser(recoveredUser);
            localStorage.setItem('mdm_user', JSON.stringify(recoveredUser));
            return;
          }
          logout();
        }
      } else {
        // If server 401 or offline, check if client supabase session is active
        const { data: sbData } = await supabase.auth.getSession();
        if (sbData?.session?.user) {
          const email = sbData.session.user.email!.toLowerCase();
          const isAdmin = ['admin@gmail.com', 'admin@gmai.com', 'antoniethantonio@gmail.com'].includes(email);
          const recoveredUser: User = {
            id: sbData.session.user.id,
            name: sbData.session.user.user_metadata?.name || (isAdmin ? 'Administradora Oficial' : 'Cliente Mocinhas'),
            email,
            phone: sbData.session.user.user_metadata?.phone || '+244 923 000 000',
            role: isAdmin ? 'admin' : 'client',
            createdAt: sbData.session.user.created_at || new Date().toISOString(),
          };
          setUser(recoveredUser);
          localStorage.setItem('mdm_user', JSON.stringify(recoveredUser));
          return;
        }
        logout();
      }
    } catch (err) {
      console.error('Failed to verify token:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, [token]);

  const login = async (identifier: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Resilient fallback for Vercel: try client-side Supabase Auth directly
        if (identifier.includes('@')) {
          try {
            const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
              email: identifier.trim().toLowerCase(),
              password,
            });

            if (sbData?.user && !sbError) {
              const email = sbData.user.email!.toLowerCase();
              const isAdmin = ['admin@gmail.com', 'admin@gmai.com', 'antoniethantonio@gmail.com'].includes(email);
              const clientUser: User = {
                id: sbData.user.id,
                name: sbData.user.user_metadata?.name || (isAdmin ? 'Administradora Oficial' : 'Cliente Mocinhas'),
                email,
                phone: sbData.user.user_metadata?.phone || '+244 923 000 000',
                role: isAdmin ? 'admin' : 'client',
                createdAt: sbData.user.created_at || new Date().toISOString(),
              };

              const fallbackToken = sbData.session?.access_token || `mdm-token-${Date.now()}`;
              setToken(fallbackToken);
              setUser(clientUser);
              localStorage.setItem('mdm_token', fallbackToken);
              localStorage.setItem('mdm_user', JSON.stringify(clientUser));
              return { success: true, user: clientUser };
            }
          } catch (clientAuthErr) {
            console.warn('Client Supabase Auth fallback attempt error:', clientAuthErr);
          }
        }

        return { success: false, error: data.error || 'Erro ao iniciar sessão.' };
      }
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('mdm_token', data.token);
      localStorage.setItem('mdm_user', JSON.stringify(data.user));
      return { success: true, user: data.user };
    } catch (err: any) {
      // Network failure on /api/auth/login: Try direct Supabase Auth
      if (identifier.includes('@')) {
        try {
          const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
            email: identifier.trim().toLowerCase(),
            password,
          });

          if (sbData?.user && !sbError) {
            const email = sbData.user.email!.toLowerCase();
            const isAdmin = ['admin@gmail.com', 'admin@gmai.com', 'antoniethantonio@gmail.com'].includes(email);
            const clientUser: User = {
              id: sbData.user.id,
              name: sbData.user.user_metadata?.name || (isAdmin ? 'Administradora Oficial' : 'Cliente Mocinhas'),
              email,
              phone: sbData.user.user_metadata?.phone || '+244 923 000 000',
              role: isAdmin ? 'admin' : 'client',
              createdAt: sbData.user.created_at || new Date().toISOString(),
            };

            const fallbackToken = sbData.session?.access_token || `mdm-token-${Date.now()}`;
            setToken(fallbackToken);
            setUser(clientUser);
            localStorage.setItem('mdm_token', fallbackToken);
            localStorage.setItem('mdm_user', JSON.stringify(clientUser));
            return { success: true, user: clientUser };
          }
        } catch (clientAuthErr) {
          console.warn('Client Supabase Auth network fallback error:', clientAuthErr);
        }
      }

      return { success: false, error: err.message || 'Erro de conexão ao servidor.' };
    }
  };

  const register = async (data: {
    name: string;
    phone: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) {
        return { success: false, error: resData.error || 'Erro ao criar conta.' };
      }
      setToken(resData.token);
      setUser(resData.user);
      localStorage.setItem('mdm_token', resData.token);
      localStorage.setItem('mdm_user', JSON.stringify(resData.user));
      return { success: true, user: resData.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erro de conexão ao servidor.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mdm_token');
    localStorage.removeItem('mdm_user');
  };

  const setAuthSession = (newUser: User, newToken: string) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('mdm_token', newToken);
    localStorage.setItem('mdm_user', JSON.stringify(newUser));
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isLoading,
    login,
    register,
    logout,
    refreshUser,
    setAuthSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
