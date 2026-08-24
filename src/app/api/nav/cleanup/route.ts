import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getSupabaseClient();

  // Find categories with invalid names (file:// URLs, empty names, etc.)
  const { data: categories, error: fetchError } = await client
    .from('nav_categories')
    .select('id, name')
    .is('deleted_at', null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const fixed: string[] = [];
  const deleted: string[] = [];

  for (const cat of categories || []) {
    const name = cat.name?.trim() || '';
    
    // Check if name is a file:// URL or looks like a path
    if (name.startsWith('file://') || name.startsWith('C:\\') || name.startsWith('/Users/') || name.startsWith('/home/')) {
      // Delete this invalid category and its links
      await client.from('nav_links').update({ deleted_at: new Date().toISOString() }).eq('category_id', cat.id);
      await client.from('nav_categories').update({ deleted_at: new Date().toISOString() }).eq('id', cat.id);
      deleted.push(name);
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: `清理完成：删除 ${deleted.length} 个无效分类`,
    deleted 
  });
}
