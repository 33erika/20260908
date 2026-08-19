import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';

/**
 * 法律咨询数据 API
 * 
 * TODO: 对接法务咨询系统真实 API
 * 当前使用 Mock 数据，等咨询系统 API 就绪后替换
 * 
 * 咨询系统 API 配置（后续替换）：
 * - BASE_URL: 咨询系统后端地址
 * - API_KEY: 调用凭证
 */

// Mock 数据 - 待替换为真实 API 调用
function getMockConsultations() {
  return {
    summary: {
      pending: 5,        // 待处理（未接单）
      processing: 3,     // 处理中
      replied: 12,       // 已回复
      closed: 28,        // 已结案
      total: 48,
    },
    recent: [
      {
        id: 'c001',
        title: '劳动合同解除咨询',
        submitter: '张三',
        department: '人力资源部',
        submit_time: '2026-08-19T10:30:00Z',
        status: 'pending',
        urgency: 'high',
      },
      {
        id: 'c002',
        title: '供应商合同违约条款',
        submitter: '李四',
        department: '采购部',
        submit_time: '2026-08-19T09:15:00Z',
        status: 'pending',
        urgency: 'normal',
      },
      {
        id: 'c003',
        title: '员工竞业限制协议',
        submitter: '王五',
        department: '研发部',
        submit_time: '2026-08-18T16:45:00Z',
        status: 'processing',
        urgency: 'normal',
      },
      {
        id: 'c004',
        title: '商标注册问题',
        submitter: '赵六',
        department: '市场部',
        submit_time: '2026-08-18T14:20:00Z',
        status: 'replied',
        urgency: 'low',
      },
      {
        id: 'c005',
        title: '劳动争议仲裁咨询',
        submitter: '孙七',
        department: '人力资源部',
        submit_time: '2026-08-18T11:00:00Z',
        status: 'pending',
        urgency: 'high',
      },
    ],
  };
}

// GET - 获取法律咨询概览数据
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult || !authResult.success) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'summary'; // summary | list

    // TODO: 替换为真实 API 调用
    // const response = await fetch(`${CONSULTATION_API_URL}/api/consultations/${type}`, {
    //   headers: { 'Authorization': `Bearer ${CONSULTATION_API_KEY}` }
    // });
    // const data = await response.json();

    const mockData = getMockConsultations();

    if (type === 'list') {
      return NextResponse.json({ data: mockData.recent });
    }

    return NextResponse.json({ data: mockData.summary });
  } catch (error) {
    console.error('Consultation API error:', error);
    return NextResponse.json({ error: '获取咨询数据失败' }, { status: 500 });
  }
}
