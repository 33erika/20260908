import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Use service role client for DB operations
    const dbClient = getSupabaseClient();
    const { data: profile } = await dbClient
      .from('profiles')
      .select('*')
      .eq('id', auth.userId)
      .maybeSingle();

    if (!profile) {
      // Check if this email should be admin (pre-defined admin emails or first user)
      const adminEmails = [
        'zixuan.huang@hollyland.com',
        'shan.lu@hollyland.com',
        'zinong.liu@hollyland.com',
      ];
      const isAdminEmail = adminEmails.includes(auth.email.toLowerCase());

      // Only allow pre-defined admin emails to create profiles
      if (!isAdminEmail) {
        return NextResponse.json({ error: '该账号未授权，请联系管理员' }, { status: 403 });
      }

      // Also check if this is the first user
      const { count } = await dbClient
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      const isFirstUser = (count ?? 0) === 0;
      const role = (isAdminEmail || isFirstUser) ? 'admin' : 'member';

      const { data: newProfile, error: createError } = await dbClient
        .from('profiles')
        .insert({
          id: auth.userId,
          email: auth.email,
          full_name: auth.fullName,
          role,
        })
        .select()
        .single();

      if (createError) {
        console.error('Profile create error:', JSON.stringify(createError));
        return NextResponse.json({ error: `Failed to create profile: ${createError.message}` }, { status: 500 });
      }
      return NextResponse.json({ user: { id: auth.userId, email: auth.email }, profile: newProfile });
    }

    // Check if profile is active
    if (!profile.is_active) {
      return NextResponse.json({ error: '该账号已被停用，请联系管理员' }, { status: 403 });
    }

    return NextResponse.json({ user: { id: auth.userId, email: auth.email }, profile });
  } catch (err) {
    console.error('Auth/me error:', err);
    return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
  }
}
