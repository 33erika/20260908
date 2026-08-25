import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseClient, getSupabaseCredentials, getSupabaseServiceRoleKey } from '@/storage/database/supabase-client';

// GET: DingTalk OAuth callback
// DingTalk redirects here with ?authCode=xxx&state=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const authCode = searchParams.get('authCode') || searchParams.get('code');
  const state = searchParams.get('state');

  console.log('[DingTalk Callback] URL:', request.url);
  console.log('[DingTalk Callback] authCode:', authCode ? 'present' : 'missing');

  if (!authCode) {
    console.log('[DingTalk Callback] No authCode, redirecting to login');
    return NextResponse.redirect(new URL('/login?error=dingtalk_no_code', request.url));
  }

  try {
    const dbClient = getSupabaseClient();

    // Read DingTalk config from system_settings
    const { data: settings } = await dbClient
      .from('system_settings')
      .select('key, value')
      .in('key', ['dingtalk_client_id', 'dingtalk_client_secret']);

    const configMap: Record<string, unknown> = {};
    for (const s of settings || []) {
      configMap[s.key] = s.value;
    }

    const clientId = configMap['dingtalk_client_id'] as string;
    const clientSecret = configMap['dingtalk_client_secret'] as string;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(new URL('/login?error=dingtalk_not_configured', request.url));
    }

    // Step 1: Exchange authCode for userAccessToken
    const tokenRes = await fetch('https://api.dingtalk.com/v1.0/oauth2/userAccessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId,
        clientSecret,
        code: authCode,
        grantType: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errData = await tokenRes.json().catch(() => ({}));
      console.error('[DingTalk Callback] Token exchange failed:', JSON.stringify(errData));
      return NextResponse.redirect(new URL('/login?error=dingtalk_token_failed', request.url));
    }

    const tokenData = await tokenRes.json();
    console.log('[DingTalk Callback] Token response keys:', Object.keys(tokenData));
    const userAccessToken = tokenData.accessToken;

    if (!userAccessToken) {
      console.log('[DingTalk Callback] No accessToken in response');
      return NextResponse.redirect(new URL('/login?error=dingtalk_no_token', request.url));
    }

    // Step 2: Get DingTalk user info
    const userRes = await fetch('https://api.dingtalk.com/v1.0/contact/users/me', {
      headers: {
        'x-acs-dingtalk-access-token': userAccessToken,
      },
    });

    if (!userRes.ok) {
      const errData = await userRes.json().catch(() => ({}));
      console.error('[DingTalk Callback] User info failed:', JSON.stringify(errData));
      return NextResponse.redirect(new URL('/login?error=dingtalk_user_info_failed', request.url));
    }

    const dtUser = await userRes.json();
    console.log('[DingTalk Callback] User info:', JSON.stringify({ nick: dtUser.nick, email: dtUser.email, unionId: dtUser.unionId }));
    // dtUser contains: nick, avatarUrl, mobile, openId, unionId, email, stateCode

    const dingtalkUserId = dtUser.unionId || dtUser.openId;
    const dtEmail = dtUser.email?.toLowerCase()?.trim() || '';
    const dtName = dtUser.nick || '';
    const dtMobile = dtUser.mobile || '';
    const dtAvatar = dtUser.avatarUrl || '';

    if (!dingtalkUserId) {
      return NextResponse.redirect(new URL('/login?error=dingtalk_no_user_id', request.url));
    }

    // Step 3: Find matching profile
    // First try by dingtalk_user_id, then by email
    let matchedProfile: { id: string; email: string; full_name: string; role: string; is_active: boolean } | null = null;

    if (dingtalkUserId) {
      const { data: byDingtalk } = await dbClient
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('dingtalk_user_id', dingtalkUserId)
        .maybeSingle();
      if (byDingtalk) {
        matchedProfile = byDingtalk;
      }
    }

    if (!matchedProfile && dtEmail) {
      const { data: byEmail } = await dbClient
        .from('profiles')
        .select('id, email, full_name, role, is_active')
        .eq('email', dtEmail)
        .maybeSingle();
      if (byEmail) {
        matchedProfile = byEmail;
        // Bind dingtalk_user_id to this profile for future logins
        await dbClient
          .from('profiles')
          .update({ dingtalk_user_id: dingtalkUserId, avatar_url: dtAvatar || undefined })
          .eq('id', byEmail.id);
      }
    }

    if (!matchedProfile) {
      console.log('[DingTalk Callback] No matching profile found for dingtalk_user_id:', dingtalkUserId, 'email:', dtEmail);
      return NextResponse.redirect(new URL('/login?error=dingtalk_no_matching_user', request.url));
    }

    if (!matchedProfile.is_active) {
      return NextResponse.redirect(new URL('/login?error=account_disabled', request.url));
    }

    // Step 4: Generate Supabase session for the matched user
    const { url: supabaseUrl } = getSupabaseCredentials();
    const serviceRoleKey = getSupabaseServiceRoleKey();

    if (!serviceRoleKey) {
      return NextResponse.redirect(new URL('/login?error=server_config', request.url));
    }

    // Generate magic link to get a session token
    const generateLinkRes = await fetch(`${supabaseUrl}/auth/v1/admin/generateLink`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'magiclink',
        email: matchedProfile.email,
      }),
    });

    if (!generateLinkRes.ok) {
      const errData = await generateLinkRes.json().catch(() => ({}));
      console.error('Generate link error:', errData);
      return NextResponse.redirect(new URL('/login?error=session_create_failed', request.url));
    }

    const linkData = await generateLinkRes.json();
    const hashedToken = linkData.properties?.hashed_token;

    if (!hashedToken) {
      return NextResponse.redirect(new URL('/login?error=no_token', request.url));
    }

    // Verify the token to get session
    const verifyRes = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        'apikey': process.env.COZE_SUPABASE_ANON_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'magiclink',
        token: hashedToken,
      }),
    });

    if (!verifyRes.ok) {
      const errData = await verifyRes.json().catch(() => ({}));
      console.error('Verify token error:', errData);
      return NextResponse.redirect(new URL('/login?error=verify_failed', request.url));
    }

    const sessionData = await verifyRes.json();
    const accessToken = sessionData.access_token;
    const refreshToken = sessionData.refresh_token;

    if (!accessToken) {
      return NextResponse.redirect(new URL('/login?error=no_access_token', request.url));
    }

    // Step 5: Redirect to frontend complete page with tokens
    const domain = process.env.COZE_PROJECT_DOMAIN_DEFAULT || '';
    const completeUrl = new URL('/auth/dingtalk/complete', domain || request.url);
    completeUrl.searchParams.set('access_token', accessToken);
    completeUrl.searchParams.set('refresh_token', refreshToken);
    if (state) completeUrl.searchParams.set('state', state);

    return NextResponse.redirect(completeUrl.toString());
  } catch (err) {
    console.error('DingTalk callback error:', err);
    return NextResponse.redirect(new URL('/login?error=dingtalk_callback_error', request.url));
  }
}
