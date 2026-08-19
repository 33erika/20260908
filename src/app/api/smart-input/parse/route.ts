import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/api-auth';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

const SYSTEM_PROMPT = `你是一个专业的法律文书解析助手。请从用户输入的法院送达短信或文书内容中提取以下结构化信息，以 JSON 格式返回：

{
  "caseNumber": "案号，如（2026）京0105民初1234号",
  "court": "审理法院名称",
  "parties": ["当事人姓名列表"],
  "documentType": "文书类型（传票/起诉状副本/举证通知书/答辩通知书/判决书/裁定书/调解书/通知书/其他）",
  "hearingDate": "开庭时间，格式 YYYY-MM-DD，如果没有则为 null",
  "deadline": "截止日期，格式 YYYY-MM-DD，如果没有则为 null",
  "deadlineType": "期限类型（开庭时间/举证期限/答辩期限/上诉期限/保全期限/其他），如果没有则为 null",
  "summary": "一句话摘要，50字以内"
}

规则：
1. 案号格式通常为（年份）+ 地区代码 + 案件类型 + 编号
2. 日期请转换为 YYYY-MM-DD 格式
3. 如果某个字段无法确定，返回 null 或空数组
4. 只返回 JSON，不要其他内容`;

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== 'string' || text.trim().length < 10) {
      return NextResponse.json({ error: '请输入有效的文本内容（至少10个字符）' }, { status: 400 });
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ];

    const response = await client.invoke(messages, {
      model: 'doubao-seed-2-0-lite-260215',
      temperature: 0.3,
    });

    const content = response.content || '';

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI 解析失败，无法提取结构化数据' }, { status: 500 });
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      data: {
        caseNumber: parsed.caseNumber || '',
        court: parsed.court || '',
        parties: Array.isArray(parsed.parties) ? parsed.parties : [],
        documentType: parsed.documentType || '',
        hearingDate: parsed.hearingDate || null,
        deadline: parsed.deadline || null,
        deadlineType: parsed.deadlineType || null,
        summary: parsed.summary || '',
        rawText: text,
      },
    });
  } catch (err) {
    console.error('Smart input parse error:', err);
    return NextResponse.json({ error: '解析服务异常，请稍后重试' }, { status: 500 });
  }
}
