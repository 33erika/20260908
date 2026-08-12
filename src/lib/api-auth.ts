import type { NextRequest } from 'next/server';

export interface AuthResult {
  userId: string;
  email: string;
  fullName: string;
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult | null> {
  const token = request.headers.get('x-session');
  if (!token) return null;

  try {
    // Get Supabase config from our own API
    const port = process.env.DEPLOY_RUN_PORT || '5000';
    const configRes = await fetch(`http://localhost:${port}/api/supabase-config`);
    if (!configRes.ok) return null;
    const config = await configRes.json();

    // Verify token by calling Supabase Auth API directly
    const res = await fetch(`${config.url}/auth/v1/user`, {
      headers: {
        'apikey': config.anonKey,
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!res.ok) return null;

    const user = await res.json();
    if (!user || !user.id) return null;

    return {
      userId: user.id,
      email: user.email || '',
      fullName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
    };
  } catch {
    return null;
  }
}
