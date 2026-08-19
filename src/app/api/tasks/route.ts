import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const owner = searchParams.get('owner');
  const status = searchParams.get('status');
  const taskType = searchParams.get('type');

  const client = getSupabaseClient();
  let query = client.from('tasks').select('*, owner:profiles!owner_id(id, full_name), creator:profiles!created_by(full_name)').is('deleted_at', null).order('created_at', { ascending: false });

  if (owner === 'me') query = query.eq('owner_id', auth.userId);
  if (status) query = query.eq('status', status);
  if (taskType) query = query.eq('task_type', taskType);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action, ...insertData } = body;
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('tasks')
    .insert({ ...insertData, created_by: auth.userId, owner_id: body.owner_id || auth.userId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, ...updates } = body;
  const client = getSupabaseClient();
  const { data, error } = await client.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
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
  const { data: task } = await client.from('tasks').select('title').eq('id', id).single();
  await client.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  await client.from('recycle_bin').insert({
    entity_type: 'task', entity_id: id, entity_name: task?.title || '',
    original_table: 'tasks', deleted_by: auth.userId,
  });
  return NextResponse.json({ success: true });
}
