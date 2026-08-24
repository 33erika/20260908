import { NextResponse } from 'next/server';

/**
 * 法律咨询 API
 *
 * 支持配置外部咨询系统 API 地址
 * 配置方式：通过请求头 x-consultation-api-url 或查询参数 apiUrl 传入
 * 如果未配置，返回空数据
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const status = searchParams.get('status');
  const limit = searchParams.get('limit') || '50';

  // 获取咨询系统 API 地址（从请求头或查询参数）
  const consultationApiUrl = request.headers.get('x-consultation-api-url') || searchParams.get('apiUrl');

  // 如果没有配置 API 地址，返回空数据
  if (!consultationApiUrl) {
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

  try {
    // 如果有 API 地址，尝试从外部系统拉取数据
    const endpoint = action === 'summary'
      ? `${consultationApiUrl}/summary`
      : `${consultationApiUrl}/list?status=${status || ''}&limit=${limit}`;

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: { revalidate: 60 }, // 60 秒缓存
    });

    if (!response.ok) {
      throw new Error(`Consultation API returned ${response.status}`);
    }

    const data = await response.json();

    if (action === 'summary') {
      return NextResponse.json({ summary: data });
    }

    return NextResponse.json({ data: data.list || data });
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
