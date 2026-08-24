'use client';

import { ExternalLink, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ConsultationsPage() {
  const CONSULT_SYSTEM_URL = 'https://tqrrx73295.coze.site';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">法律咨询</h1>
          <p className="text-sm text-slate-500 mt-1">
            跳转到法务咨询系统处理咨询请求
          </p>
        </div>
        <Button onClick={() => window.open(CONSULT_SYSTEM_URL, '_blank')}>
          <ExternalLink className="h-4 w-4 mr-2" />
          打开咨询系统
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-12">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h3 className="text-lg font-medium mb-2">咨询系统</h3>
            <p className="text-slate-500 mb-6">
              点击按钮打开法务咨询系统，处理来自各部门的法律咨询请求
            </p>
            <Button onClick={() => window.open(CONSULT_SYSTEM_URL, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              进入咨询系统
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
