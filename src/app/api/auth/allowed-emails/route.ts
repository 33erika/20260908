import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

// GET: Check if an email is allowed, or list all allowed emails (admin only)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  const dbClient = getSupabaseClient();

  // Single email check (public, used by login page)
  if (email) {
    const { data } = await dbClient
      .from('allowed_emails')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .maybeSingle();

    return NextResponse.json({ allowed: !!data });
  }

  // List all (admin only)
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await dbClient
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: emails, error } = await dbClient
    .from('allowed_emails')
    .select('*, profiles(full_name)')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: emails });
}

// POST: Add email to whitelist (admin only)
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
  const { email } = body;

  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  const { data, error } = await dbClient
    .from('allowed_emails')
    .insert({ email: normalizedEmail, created_by: auth.userId })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: '该邮箱已在白名单中' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// DELETE: Remove email from whitelist (admin only)
export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dbClient = getSupabaseClient();

  const { data: profile } = await dbClient
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .maybeSingle();

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const { error } = await dbClient
    .from('allowed_emails')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
