'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, ExternalLink, GripVertical, Loader2 } from 'lucide-react';

interface NavCategory {
  id: string; name: string; sort_order: number;
  nav_links: NavLink[];
}
interface NavLink {
  id: string; name: string; url: string; icon: string | null;
  description: string | null; sort_order: number;
}

export default function LinksPage() {
  const { api } = useApi();
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<NavCategory | null>(null);
  const [editingLink, setEditingLink] = useState<NavLink | null>(null);
  const [targetCatId, setTargetCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [linkForm, setLinkForm] = useState({ name: '', url: '', icon: '', description: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNavCategories();
      setCategories(res.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const saveCategory = async () => {
    if (!catName.trim()) return;
    try {
      if (editingCat) {
        await api.updateNavItem({ type: 'category', id: editingCat.id, name: catName });
      } else {
        await api.createNavItem({ type: 'category', name: catName, sort_order: categories.length });
      }
      setCatDialogOpen(false);
      setCatName('');
      setEditingCat(null);
      loadData();
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const saveLink = async () => {
    if (!linkForm.name.trim() || !linkForm.url.trim()) return;
    try {
      if (editingLink) {
        await api.updateNavItem({ type: 'link', id: editingLink.id, ...linkForm, category_id: targetCatId });
      } else {
        await api.createNavItem({ type: 'link', category_id: targetCatId, ...linkForm, sort_order: 0 });
      }
      setLinkDialogOpen(false);
      setLinkForm({ name: '', url: '', icon: '', description: '' });
      setEditingLink(null);
      loadData();
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!confirm('确定删除该分类及其所有链接？')) return;
    await api.deleteNavItem('category', id);
    loadData();
  };

  const deleteLink = async (id: string) => {
    await api.deleteNavItem('link', id);
    loadData();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">法务导航</h1>
          <p className="text-sm text-slate-500 mt-1">管理常用工具和网站入口</p>
        </div>
        <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingCat(null); setCatName(''); }}>
              <Plus className="h-4 w-4 mr-1" /> 新增分类
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCat ? '编辑分类' : '新增分类'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input placeholder="分类名称" value={catName} onChange={e => setCatName(e.target.value)} />
              <Button onClick={saveCategory} className="w-full">保存</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {categories.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">
          <p>暂无导航分类，请先添加分类</p>
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => (
            <Card key={cat.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{cat.name}</CardTitle>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => { setTargetCatId(cat.id); setEditingLink(null); setLinkForm({ name: '', url: '', icon: '', description: '' }); setLinkDialogOpen(true); }}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0"
                      onClick={() => { setEditingCat(cat); setCatName(cat.name); setCatDialogOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500"
                      onClick={() => deleteCategory(cat.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {(cat.nav_links || []).sort((a: NavLink, b: NavLink) => a.sort_order - b.sort_order).map(link => (
                  <div key={link.id} className="flex items-center gap-2 group p-1.5 rounded-md hover:bg-slate-50">
                    <GripVertical className="h-3 w-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                    <a href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center gap-2 min-w-0">
                      <span className="text-sm text-slate-700 truncate">{link.name}</span>
                      <ExternalLink className="h-3 w-3 text-slate-300 shrink-0" />
                    </a>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => { setTargetCatId(cat.id); setEditingLink(link); setLinkForm({ name: link.name, url: link.url, icon: link.icon || '', description: link.description || '' }); setLinkDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-red-500"
                      onClick={() => deleteLink(link.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                {(!cat.nav_links || cat.nav_links.length === 0) && (
                  <p className="text-xs text-slate-400 py-2 text-center">暂无链接</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? '编辑链接' : '新增链接'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="名称" value={linkForm.name} onChange={e => setLinkForm(f => ({ ...f, name: e.target.value }))} />
            <Input placeholder="URL" value={linkForm.url} onChange={e => setLinkForm(f => ({ ...f, url: e.target.value }))} />
            <Input placeholder="图标（可选，如字母或 emoji）" value={linkForm.icon} onChange={e => setLinkForm(f => ({ ...f, icon: e.target.value }))} />
            <Input placeholder="描述（可选）" value={linkForm.description} onChange={e => setLinkForm(f => ({ ...f, description: e.target.value }))} />
            <Button onClick={saveLink} className="w-full">保存</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
