import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('recycle_bin')
    .select('*, deleter:profiles!deleted_by(full_name)')
    .order('deleted_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action, id } = body;
  const client = getSupabaseClient();

  if (action === 'restore') {
    const { data: item } = await client.from('recycle_bin').select('*').eq('id', id).single();
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Remove deleted_at from original table
    await client.from(item.original_table).update({ deleted_at: null }).eq('id', item.entity_id);
    await client.from('recycle_bin').delete().eq('id', id);
    return NextResponse.json({ success: true });
  }

  if (action === 'permanent_delete') {
    const { data: item } = await client.from('recycle_bin').select('*').eq('id', id).single();
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await client.from(item.original_table).delete().eq('id', item.entity_id);
    await client.from('recycle_bin').delete().eq('id', id);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
