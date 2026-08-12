import { verifyAuth } from '@/lib/api-auth';
import { getSupabaseClient } from '@/storage/database/supabase-client';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = getSupabaseClient();

  const [casesAll, casesByStatus, tasksAll] = await Promise.all([
    client.from('cases').select('case_type_id, case_types(name), owner_id, profiles!owner_id(full_name), status').is('deleted_at', null),
    client.from('cases').select('status, due_date').is('deleted_at', null),
    client.from('tasks').select('status, owner_id, profiles!owner_id(full_name), due_date').is('deleted_at', null),
  ]);

  const cases = casesAll.data || [];
  const tasks = tasksAll.data || [];
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Cases stats
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  let monthNew = 0, monthClosed = 0, overdue = 0, inProgress = 0;

  for (const c of cases as unknown as Array<{ case_type_id: string; case_types: { name: string } | null; owner_id: string; profiles: { full_name: string } | null; status: string }>) {
    const typeName = c.case_types?.name || '未分类';
    byType[typeName] = (byType[typeName] || 0) + 1;
    byStatus[c.status] = (byStatus[c.status] || 0) + 1;
    const ownerName = c.profiles?.full_name || '未分配';
    byOwner[ownerName] = (byOwner[ownerName] || 0) + 1;
    if (c.status === 'in_progress') inProgress++;
  }

  const statusData = casesByStatus.data || [];
  for (const c of statusData as unknown as Array<{ status: string; due_date: string | null }>) {
    if (c.due_date && new Date(c.due_date) < now && c.status !== 'archived' && c.status !== 'resolved') overdue++;
  }

  // Tasks stats
  const taskByOwner: Record<string, number> = {};
  let tPending = 0, tInProgress = 0, tCompleted = 0, tOverdue = 0;
  for (const t of tasks as unknown as Array<{ status: string; owner_id: string; profiles: { full_name: string } | null; due_date: string | null }>) {
    const ownerName = t.profiles?.full_name || '未分配';
    taskByOwner[ownerName] = (taskByOwner[ownerName] || 0) + 1;
    if (t.status === 'pending') tPending++;
    else if (t.status === 'in_progress') tInProgress++;
    else if (t.status === 'completed') tCompleted++;
    if (t.due_date && new Date(t.due_date) < now && t.status !== 'completed' && t.status !== 'cancelled') tOverdue++;
  }

  return NextResponse.json({
    data: {
      cases: { total: cases.length, monthNew, monthClosed, overdue, inProgress, byType, byStatus, byOwner },
      tasks: { total: tasks.length, pending: tPending, inProgress: tInProgress, completed: tCompleted, overdue: tOverdue, byOwner: taskByOwner },
    },
  });
}
