import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const caseTypeId = searchParams.get('caseTypeId');
  const includeFields = searchParams.get('includeFields');

  const client = getSupabaseClient();
  let query = client.from('cases')
    .select('*, case_types(name), case_stages(name), owner:profiles!owner_id(id, full_name), creator:profiles!created_by(full_name)')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (caseTypeId) query = query.eq('case_type_id', caseTypeId);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const client = getSupabaseClient();
  const { field_values, action, ...caseData } = body;

  const { data: newCase, error } = await client
    .from('cases')
    .insert({ ...caseData, created_by: auth.userId, owner_id: caseData.owner_id || auth.userId })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Insert custom field values
  if (field_values && Array.isArray(field_values)) {
    for (const fv of field_values) {
      await client.from('case_field_values').insert({ case_id: newCase.id, field_id: fv.field_id, value: fv.value });
    }
  }

  return NextResponse.json({ data: newCase });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, field_values, ...updates } = body;
  const client = getSupabaseClient();

  const { data, error } = await client.from('cases').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (field_values && Array.isArray(field_values)) {
    for (const fv of field_values) {
      await client.from('case_field_values')
        .upsert({ case_id: id, field_id: fv.field_id, value: fv.value, updated_at: new Date().toISOString() }, { onConflict: 'case_id,field_id' });
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const client = getSupabaseClient();
  const { data: c } = await client.from('cases').select('name').eq('id', id).single();
  await client.from('cases').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  await client.from('recycle_bin').insert({
    entity_type: 'case', entity_id: id, entity_name: c?.name || '',
    original_table: 'cases', deleted_by: auth.userId,
  });
  return NextResponse.json({ success: true });
}
