import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('reminder_rules')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;
  const client = getSupabaseClient();

  if (action === 'toggle') {
    const { id, is_enabled } = body;
    const { data, error } = await client
      .from('reminder_rules')
      .update({ is_enabled, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (action === 'create') {
    const { rule_name, time_before, time_unit, sort_order } = body;
    const { data, error } = await client
      .from('reminder_rules')
      .insert({ rule_name, time_before, time_unit, sort_order: sort_order || 0 })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('reminder_rules')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const client = getSupabaseClient();
  const { error } = await client.from('reminder_rules').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
