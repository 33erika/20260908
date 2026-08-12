import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') || '';
  const type = searchParams.get('type');

  if (!q.trim()) return NextResponse.json({ data: { cases: [], tasks: [], links: [] } });

  const pattern = `%${q}%`;
  const client = getSupabaseClient();
  const results: { cases: unknown[]; tasks: unknown[]; links: unknown[] } = { cases: [], tasks: [], links: [] };

  const searches: PromiseLike<void>[] = [];

  if (!type || type === 'case') {
    searches.push(
      client.from('cases').select('id, name, status, case_types(name)').is('deleted_at', null)
        .or(`name.ilike.${pattern},opposing_party.ilike.${pattern},description.ilike.${pattern}`)
        .limit(20)
        .then(({ data }) => { results.cases = data || []; })
    );
  }

  if (!type || type === 'task') {
    searches.push(
      client.from('tasks').select('id, title, status, owner:profiles!owner_id(full_name)').is('deleted_at', null)
        .or(`title.ilike.${pattern},description.ilike.${pattern}`)
        .limit(20)
        .then(({ data }) => { results.tasks = data || []; })
    );
  }

  if (!type || type === 'link') {
    searches.push(
      client.from('nav_links').select('id, name, url, nav_categories(name)').is('deleted_at', null)
        .or(`name.ilike.${pattern},description.ilike.${pattern},url.ilike.${pattern}`)
        .limit(20)
        .then(({ data }) => { results.links = data || []; })
    );
  }

  await Promise.all(searches);
  return NextResponse.json({ data: results });
}
