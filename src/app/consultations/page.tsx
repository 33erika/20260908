'use client';

import { useEffect, useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  Inbox,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface ConsultationSummary {
  pending: number;
  processing: number;
  replied: number;
  closed: number;
}

interface Consultation {
  id: string;
  title: string;
  status: string;
  priority: string;
  submitter_name: string;
  submitter_dept: string;
  category: string;
  summary: string;
  submitted_at: string;
  url?: string;
}

const CONSULTATION_SYSTEM_URL = 'https://x88dq72729.coze.site';

export default function ConsultationsPage() {
  const { api } = useApi();
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [summary, setSummary] = useState<ConsultationSummary>({
    pending: 0,
    processing: 0,
    replied: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('');
  const [apiUrl, setApiUrl] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  const loadConsultations = async () => {
    setLoading(true);
    setError(null);
    try {
      const [listRes, summaryRes] = await Promise.all([
        api.getConsultations(filter ? { status: filter, limit: '50' } : { limit: '50' }),
        api.getConsultations({ action: 'summary' }),
      ]);
      setConsultations(listRes.data || []);
      setSummary(summaryRes.summary || { pending: 0, processing: 0, replied: 0, closed: 0 });
    } catch (err) {
      setError('加载咨询数据失败，请检查咨询系统 API 配置');
      console.error('Failed to load consultations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConsultations();
  }, [filter]);

  // 初始化时从 localStorage 读取 API 地址
  useEffect(() => {
    const savedUrl = localStorage.getItem('consultation_api_url');
    if (savedUrl) {
      setApiUrl(savedUrl);
    }
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string; icon: React.ReactNode }> = {
      pending: { variant: 'destructive', label: '待处理', icon: <AlertCircle className="h-3 w-3" /> },
      processing: { variant: 'default', label: '处理中', icon: <Clock className="h-3 w-3" /> },
      replied: { variant: 'secondary', label: '已回复', icon: <CheckCircle className="h-3 w-3" /> },
      closed: { variant: 'secondary', label: '已结案', icon: <XCircle className="h-3 w-3" /> },
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      urgent: { variant: 'destructive', label: '紧急' },
      high: { variant: 'default', label: '高' },
      normal: { variant: 'secondary', label: '普通' },
      low: { variant: 'secondary', label: '低' },
    };
    const config = variants[priority] || variants.normal;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleOpenConsultation = (consultation: Consultation) => {
    // 如果有 URL，直接跳转
    if (consultation.url) {
      window.open(consultation.url, '_blank');
    } else {
      // 否则跳转到咨询系统
      window.open(CONSULTATION_SYSTEM_URL, '_blank');
    }
  };

  const filterButtons = [
    { value: '', label: '全部' },
    { value: 'pending', label: '待处理' },
    { value: 'processing', label: '处理中' },
    { value: 'replied', label: '已回复' },
    { value: 'closed', label: '已结案' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">法律咨询</h1>
          <p className="text-muted-foreground">
            来自法务咨询系统的咨询请求，点击跳转到咨询系统处理
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            API 配置
          </Button>
          <Button variant="outline" size="sm" onClick={loadConsultations} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button size="sm" onClick={() => window.open(CONSULTATION_SYSTEM_URL, '_blank')}>
            <ExternalLink className="h-4 w-4 mr-2" />
            打开咨询系统
          </Button>
        </div>
      </div>

      {/* API Settings */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">咨询系统 API 配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiUrl">咨询系统 API 地址</Label>
              <Input
                id="apiUrl"
                placeholder="https://your-consultation-system.com"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                配置后工作台将自动拉取咨询系统的待办数据。留空则使用默认地址。
                <br />
                默认地址：{CONSULTATION_SYSTEM_URL}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                if (apiUrl) {
                  localStorage.setItem('consultation_api_url', apiUrl);
                } else {
                  localStorage.removeItem('consultation_api_url');
                }
                setShowSettings(false);
                loadConsultations();
              }}>
                保存配置
              </Button>
              <Button variant="outline" onClick={() => setShowSettings(false)}>
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('pending')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('processing')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">处理中</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.processing}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('replied')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已回复</CardTitle>
            <Inbox className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.replied}</div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter('closed')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已结案</CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-600">{summary.closed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex items-center gap-2">
        {filterButtons.map(btn => (
          <Button
            key={btn.value}
            variant={filter === btn.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(btn.value)}
          >
            {btn.label}
          </Button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consultation List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
        </div>
      ) : consultations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400">
            <Inbox className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无咨询数据</p>
            <p className="text-sm mt-2">请检查 API 配置或点击"打开咨询系统"查看</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {consultations.map(consultation => (
            <Card
              key={consultation.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleOpenConsultation(consultation)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-base font-semibold text-slate-900 truncate">
                        {consultation.title}
                      </h3>
                      {getStatusBadge(consultation.status)}
                      {getPriorityBadge(consultation.priority)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>{consultation.submitter_name}</span>
                      <span>{consultation.submitter_dept}</span>
                      <span>{consultation.category}</span>
                      <span>{new Date(consultation.submitted_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                    {consultation.summary && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                        {consultation.summary}
                      </p>
                    )}
                  </div>
                  <ExternalLink className="h-4 w-4 text-slate-400 shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
