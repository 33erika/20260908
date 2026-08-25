import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import crypto from 'crypto';

// POST: Send DingTalk robot notification
export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { webhookUrl, secret, msgType, title, text, atMobiles, isAtAll } = body;

    if (!webhookUrl) {
      return NextResponse.json({ error: 'webhookUrl is required' }, { status: 400 });
    }

    if (!text && !title) {
      return NextResponse.json({ error: 'text or title is required' }, { status: 400 });
    }

    // Build message payload
    let payload: Record<string, unknown>;

    if (msgType === 'markdown') {
      payload = {
        msgtype: 'markdown',
        markdown: {
          title: title || '法务工作台提醒',
          text: text,
        },
        at: {
          atMobiles: atMobiles || [],
          isAtAll: isAtAll || false,
        },
      };
    } else {
      // Default to text
      payload = {
        msgtype: 'text',
        text: {
          content: text || title || '',
        },
        at: {
          atMobiles: atMobiles || [],
          isAtAll: isAtAll || false,
        },
      };
    }

    // If secret is provided, compute signature
    let finalUrl = webhookUrl;
    if (secret) {
      const timestamp = Date.now();
      const stringToSign = `${timestamp}\n${secret}`;
      const hmac = crypto.createHmac('sha256', secret).update(stringToSign).digest('base64');
      const sign = encodeURIComponent(hmac);
      finalUrl = `${webhookUrl}&timestamp=${timestamp}&sign=${sign}`;
    }

    // Send to DingTalk
    const res = await fetch(finalUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await res.json();

    if (result.errcode !== 0) {
      console.error('DingTalk notify error:', result);
      return NextResponse.json(
        { error: `DingTalk API error: ${result.errmsg || 'unknown'}`, detail: result },
        { status: 502 }
      );
    }

    // Log the notification
    const dbClient = getSupabaseClient();
    await dbClient.from('operation_logs').insert({
      user_id: auth.userId,
      action: 'dingtalk_notify',
      entity_type: 'dingtalk',
      entity_id: 'webhook',
      entity_name: title || text?.substring(0, 50) || 'DingTalk Notification',
    });

    return NextResponse.json({ success: true, message: 'Notification sent successfully' });
  } catch (err) {
    console.error('DingTalk notify error:', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}

// GET: Get DingTalk notification config (webhook URL, etc.)
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dbClient = getSupabaseClient();

    const { data: settings } = await dbClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['dingtalk_webhook_url', 'dingtalk_webhook_secret', 'dingtalk_notify_enabled']);

    const configMap: Record<string, unknown> = {};
    for (const s of settings || []) {
      configMap[s.key] = s.value;
    }

    return NextResponse.json({
      enabled: configMap['dingtalk_notify_enabled'] === true,
      webhookUrl: configMap['dingtalk_webhook_url'] || '',
      hasSecret: !!(configMap['dingtalk_webhook_secret'] as string),
    });
  } catch (err) {
    console.error('DingTalk config error:', err);
    return NextResponse.json({ error: 'Failed to get config' }, { status: 500 });
  }
}
