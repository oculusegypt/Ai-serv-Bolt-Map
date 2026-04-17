import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import type { Session } from '@supabase/supabase-js';

export type UserRole = 'customer' | 'provider' | 'admin';

export interface UserProfile {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: UserRole;
  avatar?: string;
  services?: string[];
  documents?: string[];
  createdAt: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (data: RegisterData) => Promise<{ ok: boolean; needsEmailVerification?: boolean; error?: string }>;
  logout: () => Promise<void>;
  allUsers: UserProfile[];
  refreshUsers: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  phone?: string;
  name: string;
  role: UserRole;
  services?: string[];
}

const AuthContext = createContext<AuthState | undefined>(undefined);

type ProfileRow = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  role: UserRole | null;
  avatar: string | null;
  services: string[] | null;
  documents: string[] | null;
  created_at: string;
};

type LocalUserRecord = UserProfile & {
  password: string;
};

const localUsersKey = 'khidmati.localAuth.users';
const localSessionKey = 'khidmati.localAuth.sessionUserId';

const readLocalUsers = async (): Promise<LocalUserRecord[]> => {
  const raw = await AsyncStorage.getItem(localUsersKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeLocalUsers = async (users: LocalUserRecord[]) => {
  await AsyncStorage.setItem(localUsersKey, JSON.stringify(users));
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const withTimeout = useCallback(async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timeoutId: any;
    const timeout = new Promise<T>((_resolve, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`timeout:${label}`)), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    if (!isSupabaseConfigured) {
      const localUsers = await readLocalUsers();
      setAllUsers(localUsers.map(({ password, ...profile }) => profile));
      return;
    }

    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (error || !data) {
      setAllUsers([]);
      return;
    }

    const mapped = (data as ProfileRow[]).map((p) => ({
      id: p.id,
      email: p.email || '',
      phone: p.phone || undefined,
      name: p.name || 'مستخدم',
      role: (p.role || 'customer') as UserRole,
      avatar: p.avatar || undefined,
      services: p.services || undefined,
      documents: p.documents || undefined,
      createdAt: p.created_at || new Date().toISOString(),
    }));

    setAllUsers(mapped);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadSession();
      const { data: listener } = supabase.auth.onAuthStateChange(async (_event: string, session: Session | null) => {
        if (!session?.user) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        if (!session.user.email_confirmed_at) {
          setUser(null);
          setIsAuthenticated(false);
          return;
        }

        await loadProfile(session.user.id, session.user.email ?? '');
      });

      return () => {
        listener?.subscription.unsubscribe();
      };
    };

    const cleanupPromise = init();
    return () => {
      void cleanupPromise;
    };
  }, []);

  const loadSession = async () => {
    try {
      if (!isSupabaseConfigured) {
        const [sessionUserId, localUsers] = await Promise.all([
          AsyncStorage.getItem(localSessionKey),
          readLocalUsers(),
        ]);
        const record = localUsers.find((u) => u.id === sessionUserId);
        if (record) {
          const { password, ...profile } = record;
          setUser(profile);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
        setAllUsers(localUsers.map(({ password, ...profile }) => profile));
        return;
      }

      const { data, error } = await withTimeout(supabase.auth.getSession(), 8000, 'auth.getSession');
      if (error) throw error;
      const sessionUser = data.session?.user;

      if (!sessionUser) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      if (!sessionUser.email_confirmed_at) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }

      const profileRes = await withTimeout(loadProfile(sessionUser.id, sessionUser.email ?? ''), 8000, 'loadProfile');
      if (!profileRes.ok) {
        setUser(null);
        setIsAuthenticated(false);
        return;
      }
    } catch (e: any) {
      if (String(e?.message || '').startsWith('timeout:')) {
        console.warn('Auth init timeout:', e.message);
      }
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      try {
        await withTimeout(refreshUsers(), 8000, 'refreshUsers');
      } catch (e: any) {
        if (String(e?.message || '').startsWith('timeout:')) {
          console.warn('Auth refreshUsers timeout:', e.message);
        }
      }
      setIsLoading(false);
    }
  };

  const loadProfile = async (
    userId: string,
    emailFallback: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle<ProfileRow>();

    if (error) {
      setUser(null);
      setIsAuthenticated(false);
      return { ok: false, error: error.message };
    }

    let profile = data;

    if (!profile) {
      const { data: authUserRes } = await supabase.auth.getUser();
      const meta: any = authUserRes.user?.user_metadata || {};

      const upsertRes = await supabase.from('profiles').upsert({
        id: userId,
        email: meta.email ?? emailFallback,
        phone: meta.phone ?? null,
        name: meta.name ?? 'مستخدم',
        role: (meta.role ?? 'customer') as UserRole,
        avatar: meta.avatar ?? null,
        services: meta.services ?? null,
        documents: meta.documents ?? null,
      });

      if (!upsertRes.error) {
        const { data: reloaded, error: reloadError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle<ProfileRow>();
        if (!reloadError && reloaded) profile = reloaded;
      }
    }

    if (!profile) {
      setUser(null);
      setIsAuthenticated(false);
      return { ok: false, error: 'profile_missing' };
    }

    const mapped: UserProfile = {
      id: userId,
      email: profile.email || emailFallback,
      phone: profile.phone || undefined,
      name: profile.name || 'مستخدم',
      role: (profile.role || 'customer') as UserRole,
      avatar: profile.avatar || undefined,
      services: profile.services || undefined,
      documents: profile.documents || undefined,
      createdAt: profile.created_at || new Date().toISOString(),
    };

    setUser(mapped);
    setIsAuthenticated(true);
    return { ok: true };
  };

  const login = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      const normalizedEmail = email.trim().toLowerCase();
      const localUsers = await readLocalUsers();
      let record = localUsers.find((u) => u.email.toLowerCase() === normalizedEmail);

      if (record && record.password !== password) {
        return { ok: false, error: 'كلمة المرور غير صحيحة' };
      }

      if (!record) {
        record = {
          id: `local-${Date.now()}`,
          email: normalizedEmail,
          password,
          name: normalizedEmail.split('@')[0] || 'مستخدم',
          role: 'customer',
          createdAt: new Date().toISOString(),
        };
        localUsers.unshift(record);
        await writeLocalUsers(localUsers);
      }

      await AsyncStorage.setItem(localSessionKey, record.id);
      const { password: _password, ...profile } = record;
      setUser(profile);
      setIsAuthenticated(true);
      setAllUsers(localUsers.map(({ password, ...profile }) => profile));
      return { ok: true };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };

    if (!data.user?.email_confirmed_at) {
      await supabase.auth.signOut();
      return { ok: false, error: 'يرجى تفعيل الحساب من البريد الإلكتروني أولاً' };
    }

    const profileRes = await loadProfile(data.user.id, data.user.email ?? email);
    if (!profileRes.ok) return { ok: false, error: profileRes.error || 'فشل تحميل بيانات الحساب' };
    return { ok: true };
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    if (!isSupabaseConfigured) {
      const normalizedEmail = data.email.trim().toLowerCase();
      const localUsers = await readLocalUsers();
      const existingIndex = localUsers.findIndex((u) => u.email.toLowerCase() === normalizedEmail);
      const record: LocalUserRecord = {
        id: existingIndex >= 0 ? localUsers[existingIndex].id : `local-${Date.now()}`,
        email: normalizedEmail,
        password: data.password,
        phone: data.phone,
        name: data.name,
        role: data.role,
        services: data.services,
        createdAt: existingIndex >= 0 ? localUsers[existingIndex].createdAt : new Date().toISOString(),
      };

      if (existingIndex >= 0) {
        localUsers[existingIndex] = record;
      } else {
        localUsers.unshift(record);
      }

      await writeLocalUsers(localUsers);
      await AsyncStorage.setItem(localSessionKey, record.id);
      const { password, ...profile } = record;
      setUser(profile);
      setIsAuthenticated(true);
      setAllUsers(localUsers.map(({ password, ...profile }) => profile));
      return { ok: true };
    }

    const emailRedirectTo = Linking.createURL('auth');
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo,
        data: {
          role: data.role,
          name: data.name,
          phone: data.phone ?? null,
          services: data.services ?? null,
        },
      },
    });

    if (error) return { ok: false, error: error.message };
    if (!authData.user) return { ok: false, error: 'فشل إنشاء الحساب' };

    const userId = authData.user.id;

    // If email confirmation is required, Supabase usually won't create an authenticated session yet.
    // In that case, inserting into public.profiles will fail under RLS (auth.uid() is null).
    // We rely on a DB trigger to create the profile row from user metadata, or we can insert later after login.
    if (!authData.user.email_confirmed_at) {
      setUser(null);
      setIsAuthenticated(false);
      return { ok: true, needsEmailVerification: true };
    }

    // Some projects may confirm immediately and provide a session. Only then we can safely upsert profiles.
    if (authData.session?.user) {
      const insertRes = await supabase.from('profiles').upsert({
        id: userId,
        email: data.email,
        phone: data.phone ?? null,
        name: data.name,
        role: data.role,
        avatar: null,
        services: data.services ?? null,
        documents: null,
      });

      if (insertRes.error) {
        return { ok: false, error: insertRes.error.message };
      }
    }

    await loadProfile(userId, data.email);
    return { ok: true };
  }, []);

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      } else {
        await AsyncStorage.removeItem(localSessionKey);
      }
    } catch {}
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, user, login, register, logout, allUsers, refreshUsers }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
