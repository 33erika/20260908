import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('case_types')
    .select('*, case_type_fields(*), case_stages(*)')
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const client = getSupabaseClient();

  if (body.action === 'create_type') {
    const { data, error } = await client.from('case_types').insert({ name: body.name, description: body.description, created_by: auth.userId }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (body.action === 'create_field') {
    const { data, error } = await client.from('case_type_fields').insert({
      case_type_id: body.case_type_id, field_name: body.field_name,
      field_type: body.field_type, is_required: body.is_required || false,
      options: body.options || null,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (body.action === 'create_stage') {
    // Get max sort_order
    const { data: stages } = await client.from('case_stages').select('sort_order').eq('case_type_id', body.case_type_id).order('sort_order', { ascending: false }).limit(1);
    const nextOrder = (stages?.[0]?.sort_order ?? -1) + 1;
    const { data, error } = await client.from('case_stages').insert({
      case_type_id: body.case_type_id, name: body.name, sort_order: nextOrder,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  if (!type || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const client = getSupabaseClient();
  const table = type === 'field' ? 'case_type_fields' : 'case_stages';
  const { error } = await client.from(table).delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
