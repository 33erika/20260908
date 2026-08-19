import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const {
    caseName,
    caseTypeId,
    priority,
    description,
    opposing_party,
    caseNumber,
    court,
    documentType,
    hearingDate,
    deadline,
    deadlineType,
    summary,
    ownerId,
  } = body;

  if (!caseName && !caseNumber) {
    return NextResponse.json({ error: '事项名称或案号不能为空' }, { status: 400 });
  }

  const client = getSupabaseClient();

  // Build case name if not provided
  const name = caseName || caseNumber || '未命名事项';

  // Create the case
  const { data: newCase, error: caseError } = await client
    .from('cases')
    .insert({
      name,
      case_type_id: caseTypeId || null,
      status: 'pending',
      priority: priority || 'medium',
      owner_id: ownerId || auth.userId,
      opposing_party: opposing_party || null,
      description: description || summary || null,
      due_date: deadline ? new Date(deadline).toISOString() : null,
      created_by: auth.userId,
    })
    .select()
    .single();

  if (caseError) {
    return NextResponse.json({ error: caseError.message }, { status: 500 });
  }

  // Create deadline if provided
  if (deadline) {
    await client.from('case_deadlines').insert({
      case_id: newCase.id,
      deadline_type: deadlineType || '其他',
      deadline_date: new Date(deadline).toISOString(),
      description: `${documentType || ''} - ${deadlineType || '截止日期'}`,
      status: 'pending',
      created_by: auth.userId,
    });
  }

  // Create hearing date as a deadline if provided
  if (hearingDate) {
    await client.from('case_deadlines').insert({
      case_id: newCase.id,
      deadline_type: '开庭时间',
      deadline_date: new Date(hearingDate).toISOString(),
      description: `开庭审理 - ${court || ''}`,
      status: 'pending',
      created_by: auth.userId,
    });
  }

  // Add case number and court info to description if available
  if ((caseNumber || court) && newCase.description) {
    const extraInfo = [
      caseNumber ? `案号：${caseNumber}` : null,
      court ? `法院：${court}` : null,
      documentType ? `文书类型：${documentType}` : null,
    ].filter(Boolean).join(' | ');

    if (extraInfo) {
      await client
        .from('cases')
        .update({ description: `${newCase.description}\n\n${extraInfo}` })
        .eq('id', newCase.id);
    }
  }

  return NextResponse.json({ data: newCase });
}
