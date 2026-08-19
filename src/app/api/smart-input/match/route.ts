import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const caseNumber = searchParams.get('caseNumber');
  const parties = searchParams.get('parties');

  if (!caseNumber && !parties) {
    return NextResponse.json({ data: [] });
  }

  const client = getSupabaseClient();
  let query = client
    .from('cases')
    .select('id, name, status, opposing_party')
    .is('deleted_at', null);

  if (caseNumber) {
    // Search by case number in name field
    query = query.ilike('name', `%${caseNumber}%`);
  } else if (parties) {
    // Search by opposing party
    query = query.ilike('opposing_party', `%${parties}%`);
  }

  const { data, error } = await query.limit(10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data || [] });
}
