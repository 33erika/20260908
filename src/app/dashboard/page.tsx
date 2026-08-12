'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Briefcase, CheckSquare, TrendingUp, AlertTriangle } from 'lucide-react';

interface DashboardData {
  cases: {
    total: number; monthNew: number; monthClosed: number;
    overdue: number; inProgress: number;
    byType: Record<string, number>; byStatus: Record<string, number>;
    byOwner: Record<string, number>;
  };
  tasks: {
    total: number; pending: number; inProgress: number;
    completed: number; overdue: number;
    byOwner: Record<string, number>;
  };
}

const STATUS_LABELS: Record<string, string> = {
  pending: '待处理', in_progress: '处理中', resolved: '已解决', archived: '已归档',
};

export default function DashboardPage() {
  const { api } = useApi();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.getDashboard();
        setData(res.data);
      } catch { /* silent */ }
      setLoading(false);
    })();
  }, [api]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  }

  if (!data) return <div className="p-6 text-center text-slate-400">加载失败</div>;

  const maxTypeCount = Math.max(...Object.values(data.cases.byType), 1);
  const maxStatusCount = Math.max(...Object.values(data.cases.byStatus), 1);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">数据汇总</h1>
        <p className="text-sm text-slate-500 mt-1">法务事项与任务的整体情况</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <OverviewCard icon={Briefcase} label="事项总数" value={data.cases.total} sub={`本月新增 ${data.cases.monthNew}`} color="indigo" />
        <OverviewCard icon={TrendingUp} label="处理中" value={data.cases.inProgress} sub={`本月结案 ${data.cases.monthClosed}`} color="blue" />
        <OverviewCard icon={AlertTriangle} label="逾期事项" value={data.cases.overdue} sub="需关注" color="red" />
        <OverviewCard icon={CheckSquare} label="待办任务" value={data.tasks.pending + data.tasks.inProgress} sub={`已完成 ${data.tasks.completed}`} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Type */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">按事项类型</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.cases.byType).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">暂无数据</p>
            ) : (
              Object.entries(data.cases.byType).map(([type, count]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="text-sm text-slate-600 w-28 truncate">{type}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${(count / maxTypeCount) * 100}%` }} />
                  </div>
                  <span className="text-sm font-semibold text-slate-900 w-8 text-right">{count}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">按状态</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(data.cases.byStatus).length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">暂无数据</p>
            ) : (
              Object.entries(data.cases.byStatus).map(([status, count]) => {
                const colors: Record<string, string> = { pending: 'bg-slate-400', in_progress: 'bg-blue-500', resolved: 'bg-green-500', archived: 'bg-slate-300' };
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-20">{STATUS_LABELS[status] || status}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div className={`${colors[status] || 'bg-slate-400'} h-full rounded-full transition-all`} style={{ width: `${(count / maxStatusCount) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 w-8 text-right">{count}</span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Tasks Overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">任务数据</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <MiniStat label="总任务" value={data.tasks.total} />
              <MiniStat label="待处理" value={data.tasks.pending} />
              <MiniStat label="进行中" value={data.tasks.inProgress} />
              <MiniStat label="已完成" value={data.tasks.completed} />
              <MiniStat label="已逾期" value={data.tasks.overdue} highlight />
            </div>
          </CardContent>
        </Card>

        {/* By Owner */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">按负责人</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs text-slate-500 mb-2">事项分布</p>
              {Object.entries(data.cases.byOwner).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-700">{name}</span>
                  <span className="text-sm font-medium text-indigo-600">{count} 项</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-2">任务分布</p>
              {Object.entries(data.tasks.byOwner).map(([name, count]) => (
                <div key={name} className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-700">{name}</span>
                  <span className="text-sm font-medium text-blue-600">{count} 项</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, sub, color }: { icon: typeof Briefcase; label: string; value: number; sub: string; color: string }) {
  const colors: Record<string, string> = { indigo: 'from-indigo-500 to-indigo-600', blue: 'from-blue-500 to-blue-600', red: 'from-red-500 to-red-600', green: 'from-green-500 to-green-600' };
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <div className={`h-1 bg-gradient-to-r ${colors[color]}`} />
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
            <p className="text-xs text-slate-400 mt-1">{sub}</p>
          </div>
          <Icon className="h-8 w-8 text-slate-200" />
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="text-center p-3 rounded-lg bg-slate-50">
      <p className={`text-2xl font-bold ${highlight ? 'text-red-600' : 'text-slate-900'}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}
