'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, RotateCcw, Loader2, AlertCircle } from 'lucide-react';

interface RecycleItem {
  id: string; entity_type: string; entity_id: string;
  entity_name: string; deleted_at: string;
  deleter: { full_name: string } | null;
  original_table: string;
}

const TYPE_LABELS: Record<string, string> = {
  case: '法务事项', task: '任务', nav_category: '导航分类',
  nav_link: '导航链接', document: '文档',
};

export default function RecyclePage() {
  const { api } = useApi();
  const { profile } = useAuth();
  const [items, setItems] = useState<RecycleItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getRecycleBin();
      setItems(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const restore = async (id: string) => {
    await api.restoreItem(id);
    loadData();
  };

  const permanentDelete = async (id: string) => {
    if (!confirm('永久删除后无法恢复，确定继续？')) return;
    if (profile?.role !== 'admin') {
      alert('仅管理员可执行永久删除');
      return;
    }
    await api.permanentDelete(id);
    loadData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">回收站</h1>
        <p className="text-sm text-slate-500 mt-1">已删除的数据可在此恢复，仅管理员可永久删除</p>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <Trash2 className="h-12 w-12 mx-auto mb-3 text-slate-200" />
          <p>回收站为空</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 truncate">{item.entity_name || '未命名'}</p>
                    <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600">
                      {TYPE_LABELS[item.entity_type] || item.entity_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    删除人: {item.deleter?.full_name || '-'} · {new Date(item.deleted_at).toLocaleString('zh-CN')}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => restore(item.id)}>
                    <RotateCcw className="h-3 w-3 mr-1" /> 恢复
                  </Button>
                  {profile?.role === 'admin' && (
                    <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => permanentDelete(item.id)}>
                      <AlertCircle className="h-3 w-3 mr-1" /> 永久删除
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
