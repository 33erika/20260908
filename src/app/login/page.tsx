'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Scale } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { isLoading: configLoading } = useSupabaseConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  if (configLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0">
        <CardHeader className="text-center space-y-3 pb-6">
          <div className="mx-auto w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-lg">
            <Scale className="h-7 w-7 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-slate-900">法务工作台</CardTitle>
            <CardDescription className="text-base mt-1">法务团队一站式工作平台</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">邮箱</label>
              <Input
                type="email"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">密码</label>
              <Input
                type="password"
                placeholder="请输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
            )}
            <Button
              type="submit"
              className="w-full h-11 text-base font-medium"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              登录
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <p className="text-xs text-center text-slate-400">
              如需开通账号，请联系管理员
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
