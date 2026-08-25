'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useSupabaseConfig } from '@/lib/supabase-config-inject';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Scale } from 'lucide-react';

// DingTalk error messages
const DINGTALK_ERROR_MESSAGES: Record<string, string> = {
  dingtalk_no_code: '钉钉授权失败，请重试',
  dingtalk_not_configured: '钉钉登录未配置，请联系管理员',
  dingtalk_token_failed: '钉钉授权码交换失败，请重试',
  dingtalk_no_token: '钉钉登录凭证获取失败',
  dingtalk_user_info_failed: '获取钉钉用户信息失败',
  dingtalk_no_user_id: '无法获取钉钉用户标识',
  dingtalk_no_matching_user: '该钉钉账号未关联系统用户，请联系管理员',
  account_disabled: '该账号已被停用，请联系管理员',
  server_config: '服务器配置错误',
  session_create_failed: '创建登录会话失败',
  no_token: '登录凭证生成失败',
  verify_failed: '登录验证失败',
  no_access_token: '登录凭证获取失败',
  dingtalk_callback_error: '钉钉登录异常，请重试',
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn } = useAuth();
  const { isLoading: configLoading } = useSupabaseConfig();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dingtalkEnabled, setDingtalkEnabled] = useState(false);
  const [dingtalkClientId, setDingtalkClientId] = useState('');
  const [dingtalkRedirectUri, setDingtalkRedirectUri] = useState('');

  // Check for DingTalk error from callback
  useEffect(() => {
    const errCode = searchParams.get('error');
    if (errCode) {
      setError(DINGTALK_ERROR_MESSAGES[errCode] || '登录失败，请重试');
    }
  }, [searchParams]);

  // Load DingTalk config
  useEffect(() => {
    if (configLoading) return;
    fetch('/api/auth/dingtalk/config')
      .then(res => res.json())
      .then(data => {
        if (data.enabled) {
          setDingtalkEnabled(true);
          setDingtalkClientId(data.clientId);
          setDingtalkRedirectUri(data.redirectUri);
        }
      })
      .catch(() => {});
  }, [configLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn(email, password);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      router.push('/');
    }
  };

  const handleDingTalkLogin = () => {
    if (!dingtalkClientId) return;
    const state = Math.random().toString(36).substring(2);
    const params = new URLSearchParams({
      redirect_uri: dingtalkRedirectUri,
      response_type: 'code',
      client_id: dingtalkClientId,
      scope: 'openid corpid',
      state,
      prompt: 'consent',
    });
    window.location.href = `https://login.dingtalk.com/oauth2/auth?${params.toString()}`;
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
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">邮箱</label>
              <Input
                type="email"
                placeholder="请输入邮箱地址"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
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
                autoComplete="new-password"
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

          {dingtalkEnabled && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-slate-400">其他登录方式</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 text-base font-medium gap-2"
                onClick={handleDingTalkLogin}
              >
                <svg viewBox="0 0 1024 1024" className="h-5 w-5" fill="currentColor">
                  <path d="M612.8 414.4c-4.8 3.2-9.6 4.8-14.4 6.4-44.8 19.2-92.8 32-140.8 38.4-3.2 0-4.8 1.6-3.2 4.8 3.2 9.6 8 19.2 12.8 28.8 20.8 41.6 51.2 76.8 86.4 107.2 32 27.2 67.2 51.2 105.6 68.8 3.2 1.6 6.4 3.2 9.6 4.8 1.6 0 3.2-1.6 3.2-3.2 1.6-8 4.8-16 6.4-24 12.8-56 16-112 11.2-169.6-1.6-14.4-3.2-28.8-6.4-43.2 0-3.2-1.6-4.8-4.8-3.2-22.4 9.6-44.8 17.6-67.2 24-1.6 0-1.6 1.6 1.6 4.8zM528 256c-139.2 0-252.8 91.2-252.8 204.8S388.8 665.6 528 665.6 780.8 574.4 780.8 460.8 667.2 256 528 256z" />
                  <path d="M512 64C264.8 64 64 264.8 64 512s200.8 448 448 448 448-200.8 448-448S759.2 64 512 64z m0 832c-212.8 0-384-171.2-384-384S299.2 128 512 128s384 171.2 384 384-171.2 384-384 384z" />
                </svg>
                钉钉扫码登录
              </Button>
            </>
          )}

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
