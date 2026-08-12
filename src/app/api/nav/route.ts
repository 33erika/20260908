import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const client = getSupabaseClient();

  if (type === 'categories') {
    const { data, error } = await client
      .from('nav_categories')
      .select('*, nav_links(*)')
      .is('deleted_at', null)
      .order('sort_order');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (type === 'links') {
    const categoryId = searchParams.get('categoryId');
    let query = client.from('nav_links').select('*, nav_categories(name)').is('deleted_at', null).order('sort_order');
    if (categoryId) query = query.eq('category_id', categoryId);
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ data: [] });
}

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const client = getSupabaseClient();

  if (body.type === 'category') {
    const { data, error } = await client
      .from('nav_categories')
      .insert({ name: body.name, sort_order: body.sort_order || 0, created_by: auth.userId })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  if (body.type === 'link') {
    const { data, error } = await client
      .from('nav_links')
      .insert({
        category_id: body.category_id, name: body.name, url: body.url,
        icon: body.icon, description: body.description,
        sort_order: body.sort_order || 0, created_by: auth.userId,
      })
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}

export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const client = getSupabaseClient();
  const table = body.type === 'category' ? 'nav_categories' : 'nav_links';
  const { id, type: _type, ...updates } = body;

  const { data, error } = await client.from(table).update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function DELETE(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  if (!type || !id) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const client = getSupabaseClient();
  const table = type === 'category' ? 'nav_categories' : 'nav_links';

  // Soft delete
  const { error } = await client.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Add to recycle bin
  const { data: entity } = await client.from(table).select('name').eq('id', id).single();
  await client.from('recycle_bin').insert({
    entity_type: type === 'category' ? 'nav_category' : 'nav_link',
    entity_id: id, entity_name: entity?.name || '',
    original_table: table, deleted_by: auth.userId,
  });

  return NextResponse.json({ success: true });
}
