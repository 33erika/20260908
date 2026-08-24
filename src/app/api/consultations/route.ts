import { NextResponse } from 'next/server';

/**
 * 法律咨询 API
 *
 * 集成外部咨询系统 API
 * 默认使用外部系统: https://x88dq72729.coze.site/
 * 支持通过请求头 x-consultation-api-url 或查询参数 apiUrl 覆盖 API 地址
 * API Key: sk_x88dq72729_coze_site_2024
 */

// 默认外部咨询系统配置
const DEFAULT_CONSULTATION_API_URL = 'https://ef7aecc6-cfbf-443c-9f68-7a4025e195dd.dev.coze.site';
const API_KEY = 'sk_x88dq72729_coze_site_2024';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const status = searchParams.get('status');
  const limit = searchParams.get('limit') || '50';

  // 获取咨询系统 API 地址（从请求头或查询参数，否则使用默认值）
  const consultationApiUrl =
    request.headers.get('x-consultation-api-url') ||
    searchParams.get('apiUrl') ||
    DEFAULT_CONSULTATION_API_URL;

  try {
    // 构建请求端点
    const endpoint = action === 'summary'
      ? `${consultationApiUrl}/api/public/dashboard-stats`
      : `${consultationApiUrl}/api/public/dashboard-stats?status=${status || ''}&limit=${limit}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 秒超时

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      signal: controller.signal,
      next: { revalidate: 60 }, // 60 秒缓存
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`Consultation API returned ${response.status}: ${endpoint}`);
      throw new Error(`Consultation API returned ${response.status}`);
    }

    const data = await response.json();

    if (action === 'summary') {
      // 转换外部 API 数据格式为页面期望的格式
      const externalData = data.data || data;
      const pending = externalData.pending || 0;
      const processing = externalData.processing || 0;
      const replied = externalData.open || 0;
      const total = externalData.total || 0;
      const closed = Math.max(0, total - pending - processing - replied);
      
      return NextResponse.json({
        summary: {
          pending,
          processing,
          replied,
          closed,
        }
      });
    }

    return NextResponse.json({ data: data.data || data.list || data });
  } catch (error) {
    console.error('Failed to fetch from consultation API:', error);

    // 如果外部 API 调用失败，返回空数据
    if (action === 'summary') {
      return NextResponse.json({
        summary: {
          pending: 0,
          processing: 0,
          replied: 0,
          closed: 0,
        }
      });
    }
    return NextResponse.json({ data: [] });
  }
}
