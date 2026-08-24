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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      pending: { variant: 'destructive', label: '待处理' },
      processing: { variant: 'secondary', label: '处理中' },
      replied: { variant: 'default', label: '已回复' },
      closed: { variant: 'secondary', label: '已结案' },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive'; label: string }> = {
      urgent: { variant: 'destructive', label: '紧急' },
      high: { variant: 'secondary', label: '高' },
      normal: { variant: 'default', label: '普通' },
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
      window.open('https://tqrrx73295.coze.site', '_blank');
    }
  };

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
          <Button size="sm" onClick={() => window.open('https://tqrrx73295.coze.site', '_blank')}>
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
                placeholder="https://your-consultation-system.com/api"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                配置后工作台将自动拉取咨询系统的待办数据。留空则显示空状态。
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => {
                localStorage.setItem('consultation_api_url', apiUrl);
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">待处理</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{summary.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">处理中</CardTitle>
            <RefreshCw className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{summary.processing}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已回复</CardTitle>
            <Inbox className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary.replied}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已结案</CardTitle>
            <Inbox className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{summary.closed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
            <p className="mt-2 text-sm text-amber-700">
              请点击右上角"API 配置"按钮，配置咨询系统的 API 地址。
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !error && consultations.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">暂无咨询数据</h3>
              <p className="text-muted-foreground mb-4">
                咨询系统 API 未配置或暂无待办咨询
              </p>
              <Button onClick={() => setShowSettings(true)}>
                <Settings className="h-4 w-4 mr-2" />
                配置 API 地址
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Consultation List */}
      {!loading && !error && consultations.length > 0 && (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2">
            <Button
              variant={filter === '' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('')}
            >
              全部
            </Button>
            <Button
              variant={filter === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('pending')}
            >
              待处理 ({summary.pending})
            </Button>
            <Button
              variant={filter === 'processing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('processing')}
            >
              处理中 ({summary.processing})
            </Button>
            <Button
              variant={filter === 'replied' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('replied')}
            >
              已回复 ({summary.replied})
            </Button>
            <Button
              variant={filter === 'closed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('closed')}
            >
              已结案 ({summary.closed})
            </Button>
          </div>

          {/* List */}
          <div className="space-y-4">
            {consultations.map((consultation) => (
              <Card
                key={consultation.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleOpenConsultation(consultation)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{consultation.title}</h3>
                        {getPriorityBadge(consultation.priority)}
                      </div>
                      <p className="text-muted-foreground text-sm">
                        {consultation.summary}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>咨询人：{consultation.submitter_name}</span>
                        <span>部门：{consultation.submitter_dept}</span>
                        <span>分类：{consultation.category}</span>
                        <span>提交时间：{new Date(consultation.submitted_at).toLocaleString('zh-CN')}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {getStatusBadge(consultation.status)}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
