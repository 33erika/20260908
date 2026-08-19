'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth-context';
import {
  MessageSquare, Clock, CheckCircle2, AlertCircle,
  ExternalLink, RefreshCw, Filter
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Consultation = {
  id: string;
  title: string;
  submitter_name: string;
  submitter_dept: string;
  status: string;
  priority: string;
  category: string;
  summary: string;
  submitted_at: string;
  assigned_to: string | null;
  updated_at: string;
};

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-amber-100 text-amber-700' },
  processing: { label: '处理中', color: 'bg-blue-100 text-blue-700' },
  replied: { label: '已回复', color: 'bg-green-100 text-green-700' },
  closed: { label: '已结案', color: 'bg-slate-100 text-slate-600' },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  high: { label: '紧急', color: 'bg-red-100 text-red-700' },
  medium: { label: '普通', color: 'bg-blue-100 text-blue-700' },
  low: { label: '低', color: 'bg-slate-100 text-slate-600' },
};

const CONSULT_SYSTEM_URL = 'https://tqrrx73295.coze.site';

export default function ConsultationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { api } = useApi();
  const [loading, setLoading] = useState(true);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [summary, setSummary] = useState({ pending: 0, processing: 0, replied: 0, closed: 0 });
  const [activeTab, setActiveTab] = useState('pending');

  const loadData = async (status?: string) => {
    setLoading(true);
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.getConsultations(status ? { status, limit: '50' } : { limit: '50' }),
        api.getConsultations({ action: 'summary' }),
      ]);
      setConsultations(listRes.data || []);
      setSummary(summaryRes.summary || { pending: 0, processing: 0, replied: 0, closed: 0 });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleRefresh = () => loadData(activeTab === 'all' ? undefined : activeTab);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    loadData(value === 'all' ? undefined : value);
  };

  const handleViewDetail = (consultation: Consultation) => {
    // 跳转到咨询系统查看详情
    window.open(`${CONSULT_SYSTEM_URL}/consultation/${consultation.id}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">法律咨询</h1>
          <p className="text-sm text-slate-500 mt-1">
            来自法务咨询系统的咨询请求，点击跳转到咨询系统处理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            刷新
          </Button>
          <Button size="sm" onClick={() => window.open(CONSULT_SYSTEM_URL, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            打开咨询系统
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">待处理</p>
                <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-amber-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">处理中</p>
                <p className="text-2xl font-bold text-blue-600">{summary.processing}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">已回复</p>
                <p className="text-2xl font-bold text-green-600">{summary.replied}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">已结案</p>
                <p className="text-2xl font-bold text-slate-600">{summary.closed}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-slate-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">咨询列表</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">待处理 ({summary.pending})</TabsTrigger>
              <TabsTrigger value="processing">处理中 ({summary.processing})</TabsTrigger>
              <TabsTrigger value="replied">已回复 ({summary.replied})</TabsTrigger>
              <TabsTrigger value="closed">已结案 ({summary.closed})</TabsTrigger>
              <TabsTrigger value="all">全部</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : consultations.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p>暂无咨询记录</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {consultations.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-lg border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer"
                      onClick={() => handleViewDetail(c)}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-slate-900 truncate">{c.title}</h3>
                            <Badge className={priorityConfig[c.priority]?.color || 'bg-slate-100 text-slate-600'}>
                              {priorityConfig[c.priority]?.label || c.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-2 mb-2">{c.summary}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-400">
                            <span>咨询人：{c.submitter_name}</span>
                            <span>部门：{c.submitter_dept}</span>
                            <span>分类：{c.category}</span>
                            <span>提交时间：{new Date(c.submitted_at).toLocaleString('zh-CN')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={statusConfig[c.status]?.color || 'bg-slate-100 text-slate-600'}>
                            {statusConfig[c.status]?.label || c.status}
                          </Badge>
                          <ExternalLink className="h-4 w-4 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
