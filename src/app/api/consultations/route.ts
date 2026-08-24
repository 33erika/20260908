import { NextResponse, NextRequest } from 'next/server';
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
      pending: 5,
      processing: 3,
      replied: 12,
      closed: 28,
      total: 48,
      latest: {
        id: 'c001',
        title: '劳动合同解除咨询',
        submitter: '张三',
        submit_time: '2026-08-19T10:30:00Z',
        timeAgo: '2 小时前',
        url: 'https://tqrrx73295.coze.site/consultations/c001',
      },
    },
    list: [
      {
        id: 'c001',
        title: '劳动合同解除咨询',
        submitter_name: '张三',
        submitter_dept: '人力资源部',
        status: 'pending',
        priority: 'high',
        category: '劳动法',
        summary: '关于员工主动提出解除劳动合同的补偿金计算方式及法律风险咨询',
        submitted_at: '2026-08-19T10:30:00Z',
        assigned_to: null,
        updated_at: '2026-08-19T10:30:00Z',
      },
      {
        id: 'c002',
        title: '供应商合同违约条款',
        submitter_name: '李四',
        submitter_dept: '采购部',
        status: 'pending',
        priority: 'medium',
        category: '合同法',
        summary: '供应商延迟交货，合同中违约金条款是否适用及索赔流程咨询',
        submitted_at: '2026-08-19T09:15:00Z',
        assigned_to: null,
        updated_at: '2026-08-19T09:15:00Z',
      },
      {
        id: 'c003',
        title: '员工竞业限制协议',
        submitter_name: '王五',
        submitter_dept: '研发部',
        status: 'processing',
        priority: 'medium',
        category: '劳动法',
        summary: '核心技术人员离职，竞业限制协议执行及补偿金标准咨询',
        submitted_at: '2026-08-18T16:45:00Z',
        assigned_to: '法务-张律师',
        updated_at: '2026-08-19T08:00:00Z',
      },
      {
        id: 'c004',
        title: '商标注册问题',
        submitter_name: '赵六',
        submitter_dept: '市场部',
        status: 'replied',
        priority: 'low',
        category: '知识产权',
        summary: '新产品线商标注册类别选择及近似商标检索咨询',
        submitted_at: '2026-08-18T14:20:00Z',
        assigned_to: '法务-李律师',
        updated_at: '2026-08-18T17:30:00Z',
      },
      {
        id: 'c005',
        title: '劳动争议仲裁咨询',
        submitter_name: '孙七',
        submitter_dept: '人力资源部',
        status: 'pending',
        priority: 'high',
        category: '劳动法',
        summary: '员工提起劳动仲裁，需要准备的材料清单及应诉策略咨询',
        submitted_at: '2026-08-18T11:00:00Z',
        assigned_to: null,
        updated_at: '2026-08-18T11:00:00Z',
      },
    ],
  };
}

// GET - 获取法律咨询数据
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuth(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const status = searchParams.get('status');

    const mockData = getMockConsultations();

    // Summary request: ?action=summary
    if (action === 'summary') {
      return NextResponse.json({ summary: mockData.summary });
    }

    // List request: default, with optional status filter
    let list = mockData.list;
    if (status) {
      list = list.filter((c) => c.status === status);
    }

    return NextResponse.json({ data: list });
  } catch (error) {
    console.error('Consultation API error:', error);
    return NextResponse.json({ error: '获取咨询数据失败' }, { status: 500 });
  }
}
