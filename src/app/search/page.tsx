'use client';

import { useState } from 'react';
import { useApi } from '@/hooks/use-api';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Briefcase, CheckSquare, Link2, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  cases: Array<{ id: string; name: string; status: string; case_types: { name: string } | null }>;
  tasks: Array<{ id: string; title: string; status: string; owner: { full_name: string } | null }>;
  links: Array<{ id: string; name: string; url: string; nav_categories: { name: string } | null }>;
}

export default function SearchPage() {
  const { api } = useApi();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const handleSearch = async (q?: string) => {
    const searchQ = q ?? query;
    if (!searchQ.trim()) return;
    setLoading(true);
    try {
      const res = await api.search(searchQ, typeFilter !== 'all' ? typeFilter : undefined);
      setResults(res.data);
    } catch { /* silent */ }
    setLoading(false);
  };

  const totalResults = results ? results.cases.length + results.tasks.length + results.links.length : 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">全局搜索</h1>
        <p className="text-sm text-slate-500 mt-1">搜索法务事项、待办任务和导航链接</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            className="pl-10 h-11"
            placeholder="输入关键词搜索..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { value: 'all', label: '全部' },
            { value: 'case', label: '事项' },
            { value: 'task', label: '任务' },
            { value: 'link', label: '导航' },
          ].map(t => (
            <button key={t.value}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === t.value ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
              onClick={() => { setTypeFilter(t.value); if (query) handleSearch(); }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      )}

      {!loading && results && (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">找到 {totalResults} 条结果</p>

          {/* Cases */}
          {results.cases.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-indigo-600" /> 法务事项 ({results.cases.length})
              </h3>
              <div className="space-y-2">
                {results.cases.map(c => (
                  <Link key={c.id} href={`/cases`}>
                    <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.case_types?.name}</p>
                        </div>
                        <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600">{c.status}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-blue-600" /> 待办任务 ({results.tasks.length})
              </h3>
              <div className="space-y-2">
                {results.tasks.map(t => (
                  <Link key={t.id} href="/todos">
                    <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{t.title}</p>
                          <p className="text-xs text-slate-400">{t.owner?.full_name}</p>
                        </div>
                        <Badge className="text-[10px] border-0 bg-blue-100 text-blue-700">{t.status}</Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {results.links.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4 text-green-600" /> 导航链接 ({results.links.length})
              </h3>
              <div className="space-y-2">
                {results.links.map(l => (
                  <a key={l.id} href={l.url} target="_blank" rel="noopener noreferrer">
                    <Card className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{l.name}</p>
                          <p className="text-xs text-slate-400">{l.nav_categories?.name}</p>
                        </div>
                        <Link2 className="h-4 w-4 text-slate-300" />
                      </CardContent>
                    </Card>
                  </a>
                ))}
              </div>
            </div>
          )}

          {totalResults === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Search className="h-12 w-12 mx-auto mb-3 text-slate-200" />
              <p>未找到匹配结果</p>
            </div>
          )}
        </div>
      )}

      {!loading && !results && (
        <div className="text-center py-16 text-slate-400">
          <Search className="h-12 w-12 mx-auto mb-3 text-slate-200" />
          <p>输入关键词开始搜索</p>
          <p className="text-xs mt-1">支持模糊匹配事项名称、对方当事人、任务标题等</p>
        </div>
      )}
    </div>
  );
}
