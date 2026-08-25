import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';

// GET: Get all DingTalk settings
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbClient = getSupabaseClient();

    // Check admin
    const { data: profile } = await dbClient
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: settings } = await dbClient
      .from('system_settings')
      .select('key, value')
      .in('key', [
        'dingtalk_client_id',
        'dingtalk_client_secret',
        'dingtalk_enabled',
        'dingtalk_webhook_url',
        'dingtalk_webhook_secret',
        'dingtalk_notify_enabled',
      ]);

    const configMap: Record<string, unknown> = {};
    for (const s of settings || []) {
      configMap[s.key] = s.value;
    }

    return NextResponse.json({
      // Login config
      loginEnabled: configMap['dingtalk_enabled'] === true,
      clientId: (configMap['dingtalk_client_id'] as string) || '',
      clientSecret: (configMap['dingtalk_client_secret'] as string) || '',
      // Notify config
      notifyEnabled: configMap['dingtalk_notify_enabled'] === true,
      webhookUrl: (configMap['dingtalk_webhook_url'] as string) || '',
      webhookSecret: (configMap['dingtalk_webhook_secret'] as string) || '',
    });
  } catch (err) {
    console.error('Get DingTalk settings error:', err);
    return NextResponse.json({ error: 'Failed to get settings' }, { status: 500 });
  }
}

// POST: Save DingTalk settings
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbClient = getSupabaseClient();

    // Check admin
    const { data: profile } = await dbClient
      .from('profiles')
      .select('role')
      .eq('id', auth.userId)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      loginEnabled,
      clientId,
      clientSecret,
      notifyEnabled,
      webhookUrl,
      webhookSecret,
    } = body;

    // Upsert settings
    const settingsToSave = [
      { key: 'dingtalk_enabled', value: !!loginEnabled, description: 'DingTalk login enabled' },
      { key: 'dingtalk_client_id', value: (clientId as string) || '', description: 'DingTalk AppKey/ClientID' },
      { key: 'dingtalk_client_secret', value: (clientSecret as string) || '', description: 'DingTalk AppSecret/ClientSecret' },
      { key: 'dingtalk_notify_enabled', value: !!notifyEnabled, description: 'DingTalk notification enabled' },
      { key: 'dingtalk_webhook_url', value: (webhookUrl as string) || '', description: 'DingTalk robot webhook URL' },
      { key: 'dingtalk_webhook_secret', value: (webhookSecret as string) || '', description: 'DingTalk robot webhook secret (for signing)' },
    ];

    for (const setting of settingsToSave) {
      const { error } = await dbClient
        .from('system_settings')
        .upsert(
          { key: setting.key, value: setting.value as unknown as Record<string, unknown>, description: setting.description, updated_by: auth.userId },
          { onConflict: 'key' }
        );
      if (error) {
        console.error(`Failed to save setting ${setting.key}:`, error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Save DingTalk settings error:', err);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
