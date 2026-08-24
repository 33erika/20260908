import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';

/**
 * 法律咨询 API
 *
 * 当前咨询系统 API 未对接，返回空数据
 * 后续对接真实咨询系统 API 后替换
 */

export async function GET(request: Request) {
  // 暂时跳过认证，方便测试
  // const authResult = await verifyAuth(request);
  // if (!authResult.success) {
  //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  // 返回空数据，不编造 mock 数据
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
