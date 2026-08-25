'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';
import { Loader2 } from 'lucide-react';

export default function DingTalkCompletePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (!accessToken || !refreshToken) {
      setError('Missing authentication tokens');
      setTimeout(() => router.push('/login'), 2000);
      return;
    }

    async function completeSignIn() {
      try {
        const supabase = await getSupabaseBrowserClientWithRetry();

        // Set the session with the tokens from DingTalk callback
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken!,
          refresh_token: refreshToken!,
        });

        if (sessionError) {
          console.error('Set session error:', sessionError);
          setError('Failed to set session: ' + sessionError.message);
          setTimeout(() => router.push('/login'), 2000);
          return;
        }

        // Session set successfully, redirect to home
        router.push('/');
      } catch (err) {
        console.error('Complete sign in error:', err);
        setError('Authentication failed');
        setTimeout(() => router.push('/login'), 2000);
      }
    }

    completeSignIn();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="text-red-500 text-sm">{error}</div>
            <p className="text-slate-400 text-sm">正在返回登录页...</p>
          </>
        ) : (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
            <p className="text-slate-600">正在完成钉钉登录...</p>
          </>
        )}
      </div>
    </div>
  );
}
