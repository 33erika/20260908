'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import {
  Briefcase, CheckSquare, Clock, AlertTriangle,
  TrendingUp, Calendar, ArrowRight, ExternalLink, Loader2,
  MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface Task {
  id: string; title: string; status: string; priority: string;
  due_date: string | null; progress: number; importance: string; urgency: string;
  owner: { full_name: string } | null;
}
interface CaseItem {
  id: string; name: string; status: string; priority: string;
  due_date: string | null; updated_at: string;
  case_types: { name: string } | null;
  owner: { full_name: string } | null;
}
interface NavItem {
  id: string; name: string; url: string; icon: string | null;
  nav_categories: { name: string } | null;
}
interface ConsultationSummary {
  pending: number; processing: number; replied: number; closed: number;
  latest: { id: string; title: string; submitter: string; submit_time: string; timeAgo: string; url: string } | null;
}

export default function HomePage() {
  const { api } = useApi();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [navLinks, setNavLinks] = useState<NavItem[]>([]);
  const [consultationSummary, setConsultationSummary] = useState<ConsultationSummary | null>(null);
  const [stats, setStats] = useState({ caseCount: 0, monthNew: 0, monthClosed: 0, overdue: 0, taskCount: 0 });

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [tasksRes, casesRes, navRes, dashRes, consultationRes] = await Promise.all([
        api.getTasks({ owner: 'me' }),
        api.getCases(),
        api.getNavCategories(),
        api.getDashboard(),
        api.getConsultations(),
      ]);
      setTasks(tasksRes.data || []);
      setCases(casesRes.data || []);
      setConsultationSummary(consultationRes.data || null);
      setStats({
        caseCount: dashRes.data?.cases?.total || 0,
        monthNew: dashRes.data?.cases?.monthNew || 0,
        monthClosed: dashRes.data?.cases?.monthClosed || 0,
        overdue: dashRes.data?.cases?.overdue || 0,
        taskCount: dashRes.data?.tasks?.pending || 0,
      });

      // Flatten nav links for common links
      const links: NavItem[] = [];
      for (const cat of (navRes.data || []) as Array<{ id: string; name: string; nav_links: NavItem[] }>) {
        for (const link of cat.nav_links || []) {
          links.push({ ...link, nav_categories: { name: cat.name } });
        }
      }
      setNavLinks(links.slice(0, 8));
    } catch {
      // silent
    }
    setLoading(false);
  };

  const today = new Date().toISOString().split('T')[0];
  const myTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const todayTasks = myTasks.filter(t => t.due_date && t.due_date.startsWith(today));
  const overdueTasks = myTasks.filter(t => t.due_date && t.due_date < new Date().toISOString() && t.status !== 'completed');
  const urgentTasks = myTasks.filter(t => t.importance === 'important' && t.urgency === 'urgent');
  const upcomingTasks = myTasks.filter(t => t.due_date && t.due_date > new Date().toISOString() && t.due_date < new Date(Date.now() + 7 * 86400000).toISOString());

  const activeCases = cases.filter(c => c.status !== 'archived');
  const recentCases = [...cases].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {getGreeting()}，{profile?.full_name || '用户'}
        </h1>
        <p className="text-sm text-slate-500 mt-1">法务工作台 - 工作总览</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={Briefcase} label="当前事项" value={stats.caseCount} color="indigo" />
        <StatCard icon={TrendingUp} label="本月新增" value={stats.monthNew} color="blue" />
        <StatCard icon={CheckSquare} label="本月结案" value={stats.monthClosed} color="green" />
        <StatCard icon={AlertTriangle} label="逾期事项" value={stats.overdue} color="red" />
        <StatCard icon={Clock} label="待办任务" value={stats.taskCount} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-indigo-600" />
                我的待办
              </CardTitle>
              <Link href="/todos">
                <Button variant="ghost" size="sm" className="text-xs">查看全部 <ArrowRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">今日到期</p>
                {todayTasks.slice(0, 3).map(t => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            )}
            {overdueTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-red-500 mb-2">已逾期</p>
                {overdueTasks.slice(0, 3).map(t => (
                  <TaskItem key={t.id} task={t} overdue />
                ))}
              </div>
            )}
            {urgentTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-600 mb-2">重要且紧急</p>
                {urgentTasks.slice(0, 3).map(t => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            )}
            {upcomingTasks.length > 0 && (
              <div>
                <p className="text-xs font-medium text-slate-500 mb-2">即将到期</p>
                {upcomingTasks.slice(0, 3).map(t => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            )}
            {myTasks.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">暂无待办任务</p>
            )}
          </CardContent>
        </Card>

        {/* Cases Overview */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-600" />
                法务事项概览
              </CardTitle>
              <Link href="/cases">
                <Button variant="ghost" size="sm" className="text-xs">查看全部 <ArrowRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentCases.map(c => (
              <Link key={c.id} href={`/cases/${c.id}`} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-400">{c.case_types?.name} · {c.owner?.full_name || '-'}</p>
                </div>
                <StatusBadge status={c.status} />
              </Link>
            ))}
            {cases.length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">暂无事项</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Common Links */}
      {navLinks.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-indigo-600" />
                常用导航
              </CardTitle>
              <Link href="/links">
                <Button variant="ghost" size="sm" className="text-xs">管理导航 <ArrowRight className="h-3 w-3 ml-1" /></Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {navLinks.map(link => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-3 rounded-lg border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
                >
                  <div className="w-8 h-8 rounded-md bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600">
                    {link.icon || link.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{link.name}</p>
                    <p className="text-xs text-slate-400 truncate">{link.nav_categories?.name}</p>
                  </div>
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 法律咨询概览 */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-purple-600" />
              法律咨询概览
            </CardTitle>
            <Link href="/consultations">
              <Button variant="ghost" size="sm" className="text-xs">查看全部 <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-slate-300" /></div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{consultationSummary?.pending || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">待处理</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{consultationSummary?.processing || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">处理中</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{consultationSummary?.replied || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">已回复</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-600">{consultationSummary?.closed || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">已结案</div>
                </div>
              </div>
              {consultationSummary?.latest && (
                <div className="border-t pt-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-orange-500 flex-shrink-0"></span>
                      <span className="text-sm text-slate-700 truncate">最新咨询：{consultationSummary.latest.title}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">{consultationSummary.latest.timeAgo}</span>
                    </div>
                    <a href={`${consultationSummary.latest.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-600 hover:text-indigo-800 flex-shrink-0 ml-2">去处理 →</a>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了';
  if (hour < 12) return '上午好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

function StatCard({ icon: Icon, label, value, color }: { icon: typeof Briefcase; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskItem({ task, overdue }: { task: Task; overdue?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
      <div className={`w-2 h-2 rounded-full ${overdue ? 'bg-red-500' : task.priority === 'urgent' ? 'bg-amber-500' : 'bg-slate-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate">{task.title}</p>
        {task.due_date && (
          <p className={`text-xs ${overdue ? 'text-red-500' : 'text-slate-400'}`}>
            <Calendar className="h-3 w-3 inline mr-1" />
            {new Date(task.due_date).toLocaleDateString('zh-CN')}
          </p>
        )}
      </div>
      <Progress value={task.progress} className="w-16 h-1.5" />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: '待处理', className: 'bg-slate-100 text-slate-600' },
    in_progress: { label: '处理中', className: 'bg-blue-100 text-blue-700' },
    resolved: { label: '已解决', className: 'bg-green-100 text-green-700' },
    archived: { label: '已归档', className: 'bg-slate-100 text-slate-500' },
  };
  const s = map[status] || map.pending;
  return <Badge className={`${s.className} text-[10px] border-0`}>{s.label}</Badge>;
}
