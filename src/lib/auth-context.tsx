'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import type { SupabaseClient, User } from '@supabase/supabase-js';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, token: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: { 'x-session': token },
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();
        const { data: { session } } = await supabase.auth.getSession();

        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await fetchProfile(session.user.id, session.access_token);
          }
        }
      } catch {
        // silent
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    // Listen for auth changes
    getSupabaseBrowserClientWithRetry().then((supabase) => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (mounted) {
          if (event === 'SIGNED_IN' && session) {
            setUser(session.user);
            await fetchProfile(session.user.id, session.access_token);
          } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
          }
        }
      });

      return () => subscription.unsubscribe();
    });

    return () => { mounted = false; };
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    const supabase = await getSupabaseBrowserClientWithRetry();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    const signUpUser = data.user;
    if (data.session && signUpUser) {
      setUser(signUpUser);
      await fetchProfile(signUpUser.id, data.session.access_token);
    }
    return {};
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    // Check whitelist before allowing registration
    try {
      const checkRes = await fetch(`/api/auth/allowed-emails?email=${encodeURIComponent(email)}`);
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        if (!checkData.allowed) {
          return { error: '该邮箱不在允许注册的白名单中，请联系管理员添加' };
        }
      }
    } catch {
      return { error: '白名单校验失败，请稍后重试' };
    }

    const supabase = await getSupabaseBrowserClientWithRetry();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: error.message };
    if (data.session && data.user) {
      setUser(data.user);
      await fetchProfile(data.user.id, data.session.access_token);
    }
    return {};
  };

  const signOut = async () => {
    const supabase = await getSupabaseBrowserClientWithRetry();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      const supabase = await getSupabaseBrowserClientWithRetry();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchProfile(user.id, session.access_token);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      isAuthenticated: !!user,
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
