import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient, getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

// POST: Admin creates a user account (creates auth user + profile + whitelist entry)
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbClient = getSupabaseClient();

  // Check admin
  const { data: profile } = await dbClient
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { email, fullName, password } = body;

  if (!email || !fullName || !password) {
    return NextResponse.json({ error: '邮箱、姓名和密码均为必填' }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: '密码至少6位' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Check if user already exists in whitelist
  const { data: existingWhitelist } = await dbClient
    .from('allowed_emails')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  // Check if profile already exists with this email
  const { data: existingProfile } = await dbClient
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (existingProfile) {
    return NextResponse.json({ error: '该邮箱已存在账号' }, { status: 409 });
  }

  // Create user via Supabase Admin API
  const { url } = getSupabaseCredentials();
  const serviceRoleKey = getSupabaseServiceRoleKey();

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Service role key not configured' }, { status: 500 });
  }

  const adminRes = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    }),
  });

  if (!adminRes.ok) {
    const errData = await adminRes.json().catch(() => ({}));
    const msg = errData.msg || errData.error_description || errData.error || '创建用户失败';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const newUser = await adminRes.json();

  // Create profile
  const { error: profileError } = await dbClient
    .from('profiles')
    .insert({
      id: newUser.id,
      email: normalizedEmail,
      full_name: fullName,
      role: 'member',
    });

  if (profileError) {
    console.error('Profile create error:', profileError);
  }

  // Add to whitelist if not already there
  if (!existingWhitelist) {
    await dbClient
      .from('allowed_emails')
      .insert({ email: normalizedEmail, created_by: auth.userId });
  }

  return NextResponse.json({
    data: {
      id: newUser.id,
      email: normalizedEmail,
      fullName,
    },
  });
}
