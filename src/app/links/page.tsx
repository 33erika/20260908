'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Pencil, Trash2, ExternalLink, ChevronDown, ChevronRight, GripVertical, Loader2, Link2 } from 'lucide-react';

interface NavCategory {
  id: string;
  name: string;
  sort_order: number;
  nav_links: NavLink[];
}

interface NavLink {
  id: string;
  name: string;
  url: string;
  icon: string | null;
  description: string | null;
  sort_order: number;
}

// 可拖拽的分类组件
function SortableCategory({
  category,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onAddLink,
  onEditLink,
  onDeleteLink,
  onDragEnd,
}: {
  category: NavCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddLink: () => void;
  onEditLink: (link: NavLink) => void;
  onDeleteLink: (id: string) => void;
  onDragEnd: (event: DragEndEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: category.id,
    data: { type: 'category' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const links = (category.nav_links || []).sort((a: NavLink, b: NavLink) => a.sort_order - b.sort_order);

  return (
    <div ref={setNodeRef} style={style} className="border border-slate-200 rounded-lg bg-white">
      {/* 分类头部 */}
      <div className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-slate-500" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-500" />
            )}
            <span className="font-semibold text-slate-900">{category.name}</span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              {links.length} 个链接
            </span>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onAddLink}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 链接列表 */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
                {links.map(link => (
                  <SortableLink
                    key={link.id}
                    link={link}
                    onEdit={() => onEditLink(link)}
                    onDelete={() => onDeleteLink(link.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
          {links.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">暂无链接，点击上方 + 添加</p>
          )}
        </div>
      )}
    </div>
  );
}

// 可拖拽的链接卡片组件
function SortableLink({
  link,
  onEdit,
  onDelete,
}: {
  link: NavLink;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: link.id,
    data: { type: 'link' },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative border border-slate-200 rounded-lg p-4 hover:shadow-md hover:border-slate-300 transition-all bg-white"
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-50 text-blue-600 shrink-0">
          {link.icon ? (
            <span className="text-lg">{link.icon}</span>
          ) : (
            <Link2 className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 hover:underline"
          >
            <span className="font-medium text-slate-900 truncate">{link.name}</span>
            <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          </a>
          {link.description && (
            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{link.description}</p>
          )}
        </div>
      </div>
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-500" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

export default function LinksPage() {
  const { api } = useApi();
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<NavCategory | null>(null);
  const [editingLink, setEditingLink] = useState<NavLink | null>(null);
  const [targetCatId, setTargetCatId] = useState('');
  const [catName, setCatName] = useState('');
  const [linkForm, setLinkForm] = useState({ name: '', url: '', icon: '', description: '' });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getNavCategories();
      setCategories(res.data || []);
      // 默认展开所有分类
      setExpandedCats(new Set((res.data || []).map((c: NavCategory) => c.id)));
    } catch { /* silent */ }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  // 自动清理无效分类
  useEffect(() => {
    const cleanup = async () => {
      const invalidCats = categories.filter(c =>
        c.name.startsWith('file://') || c.name.startsWith('C:\\\\') || c.name.startsWith('/Users/')
      );
      for (const cat of invalidCats) {
        try {
          await api.deleteNavItem('category', cat.id);
        } catch { /* silent */ }
      }
      if (invalidCats.length > 0) loadData();
    };
    if (categories.length > 0) cleanup();
  }, [categories, api, loadData]);

  const toggleCategory = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const handleCategoryDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newCategories = arrayMove(categories, oldIndex, newIndex);
    setCategories(newCategories);

    // 更新排序
    try {
      await Promise.all(
        newCategories.map((cat, idx) =>
          api.updateNavItem({ type: 'category', id: cat.id, sort_order: idx })
        )
      );
    } catch { /* silent */ }
  };

  const handleLinkDragEnd = async (categoryId: string, event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const category = categories.find(c => c.id === categoryId);
    if (!category) return;

    const links = (category.nav_links || []).sort((a: NavLink, b: NavLink) => a.sort_order - b.sort_order);
    const oldIndex = links.findIndex(l => l.id === active.id);
    const newIndex = links.findIndex(l => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newLinks = arrayMove(links, oldIndex, newIndex);
    const newCategories = categories.map(c =>
      c.id === categoryId ? { ...c, nav_links: newLinks } : c
    );
    setCategories(newCategories);

    // 更新排序
    try {
      await Promise.all(
        newLinks.map((link, idx) =>
          api.updateNavItem({ type: 'link', id: link.id, sort_order: idx })
        )
      );
    } catch { /* silent */ }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* 页面头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">法务导航</h1>
          <p className="text-sm text-slate-500 mt-1">统一管理日常使用的系统、网站与工具入口，可自由编辑</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => { setEditingCat(null); setCatName(''); setCatDialogOpen(true); }}>
            新增分类
          </Button>
          <Button onClick={() => {
            if (categories.length === 0) {
              alert('请先添加分类');
              return;
            }
            setTargetCatId(categories[0].id);
            setEditingLink(null);
            setLinkForm({ name: '', url: '', icon: '', description: '' });
            setLinkDialogOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-1" /> 新增链接
          </Button>
        </div>
      </div>

      {/* 分类列表 */}
      {categories.length === 0 ? (
        <div className="border border-dashed border-slate-300 rounded-lg p-12 text-center">
          <p className="text-slate-500">暂无导航分类，请点击"新增分类"开始</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleCategoryDragEnd}
        >
          <SortableContext items={categories.map(c => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {categories.map(cat => (
                <SortableCategory
                  key={cat.id}
                  category={cat}
                  isExpanded={expandedCats.has(cat.id)}
                  onToggle={() => toggleCategory(cat.id)}
                  onEdit={() => { setEditingCat(cat); setCatName(cat.name); setCatDialogOpen(true); }}
                  onDelete={() => deleteCategory(cat.id)}
                  onAddLink={() => {
                    setTargetCatId(cat.id);
                    setEditingLink(null);
                    setLinkForm({ name: '', url: '', icon: '', description: '' });
                    setLinkDialogOpen(true);
                  }}
                  onEditLink={(link) => {
                    setTargetCatId(cat.id);
                    setEditingLink(link);
                    setLinkForm({ name: link.name, url: link.url, icon: link.icon || '', description: link.description || '' });
                    setLinkDialogOpen(true);
                  }}
                  onDeleteLink={deleteLink}
                  onDragEnd={(event) => handleLinkDragEnd(cat.id, event)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* 分类编辑对话框 */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
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

      {/* 链接编辑对话框 */}
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
