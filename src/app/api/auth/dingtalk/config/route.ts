import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: Return DingTalk OAuth config for frontend
export async function GET(request: NextRequest) {
  try {
    const dbClient = getSupabaseClient();

    // Read DingTalk config from system_settings
    const { data: settings } = await dbClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['dingtalk_client_id', 'dingtalk_client_secret', 'dingtalk_enabled']);

    const configMap: Record<string, unknown> = {};
    for (const s of settings || []) {
      configMap[s.key] = s.value;
    }

    const isEnabled = configMap['dingtalk_enabled'] === true;
    const clientId = (configMap['dingtalk_client_id'] as string) || '';

    if (!isEnabled || !clientId) {
      return NextResponse.json({ enabled: false });
    }

    // Build redirect URI for callback
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || `${proto}://${host}`;
    const redirectUri = `${domain}/api/auth/dingtalk/callback`;

    return NextResponse.json({
      enabled: true,
      clientId,
      redirectUri,
    });
  } catch (err) {
    console.error('DingTalk config error:', err);
    return NextResponse.json({ enabled: false });
  }
}
