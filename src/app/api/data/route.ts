import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

// All business tables in dependency order (parents first)
const TABLES_IN_ORDER = [
  'profiles',
  'nav_categories',
  'nav_links',
  'case_types',
  'case_type_fields',
  'case_stages',
  'cases',
  'case_field_values',
  'tasks',
  'case_documents',
  'operation_logs',
  'recycle_bin',
  'system_settings',
] as const;

// Reverse order for deletion (children first)
const TABLES_REVERSE_ORDER = [...TABLES_IN_ORDER].reverse();

/**
 * GET /api/data - Export all data as JSON backup
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check admin role
  const client = getSupabaseClient();
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  try {
    const backup: Record<string, unknown[]> = {};
    const stats: Record<string, number> = {};

    for (const table of TABLES_IN_ORDER) {
      const { data, error } = await client.from(table).select('*');
      if (error) {
        return NextResponse.json(
          { error: `Failed to export ${table}: ${error.message}` },
          { status: 500 }
        );
      }
      backup[table] = data || [];
      stats[table] = (data || []).length;
    }

    return NextResponse.json({
      data: {
        version: '1.0',
        exported_at: new Date().toISOString(),
        exported_by: auth.email,
        stats,
        tables: backup,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Export failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

/**
 * POST /api/data - Import data from JSON or Clear all data
 * Body: { action: 'import', data: {...} } | { action: 'clear' }
 */
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getSupabaseClient();

  // Check admin role
  const { data: profile } = await client
    .from('profiles')
    .select('role')
    .eq('id', auth.userId)
    .single();

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
  }

  const body = await request.json();

  if (body.action === 'clear') {
    return handleClear(client, auth.userId);
  }

  if (body.action === 'import') {
    return handleImport(client, body.data, auth.userId);
  }

  return NextResponse.json({ error: 'Invalid action. Use "import" or "clear".' }, { status: 400 });
}

async function handleClear(
  client: ReturnType<typeof getSupabaseClient>,
  _userId: string
) {
  try {
    const stats: Record<string, number> = {};

    // Delete in reverse dependency order (children first)
    for (const table of TABLES_REVERSE_ORDER) {
      // Skip profiles - we keep user accounts, just clear business data
      if (table === 'profiles') continue;

      const { error } = await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        return NextResponse.json(
          { error: `Failed to clear ${table}: ${error.message}` },
          { status: 500 }
        );
      }
      stats[table] = -1; // -1 means "cleared"
    }

    return NextResponse.json({
      data: { message: 'All business data cleared successfully (profiles preserved)', stats },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Clear failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

async function handleImport(
  client: ReturnType<typeof getSupabaseClient>,
  importData: Record<string, unknown[]>,
  _userId: string
) {
  if (!importData || !importData.tables) {
    return NextResponse.json({ error: 'Invalid import data format. Expected { tables: {...} }' }, { status: 400 });
  }

  const tables = importData.tables;
  const stats: Record<string, number> = {};

  try {
    // Import in dependency order (parents first)
    for (const table of TABLES_IN_ORDER) {
      const rows = tables[table];
      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        stats[table] = 0;
        continue;
      }

      // Skip profiles - don't overwrite existing user accounts
      if (table === 'profiles') {
        stats[table] = rows.length;
        continue;
      }

      // Clear existing data first for this table
      await client.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert in batches of 100 to avoid payload limits
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await client.from(table).insert(batch);
        if (error) {
          return NextResponse.json(
            { error: `Failed to import ${table} (batch ${Math.floor(i / batchSize) + 1}): ${error.message}` },
            { status: 500 }
          );
        }
      }
      stats[table] = rows.length;
    }

    return NextResponse.json({
      data: { message: 'Data imported successfully', stats },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Import failed: ${err instanceof Error ? err.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
