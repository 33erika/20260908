'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, Loader2, Calendar, User, Filter } from 'lucide-react';

interface Task {
  id: string; title: string; task_type: string; status: string;
  priority: string; urgency: string; importance: string; progress: number;
  due_date: string | null; due_time: string | null;
  description: string | null; link_url: string | null;
  period_type: string | null;
  owner: { id: string; full_name: string } | null;
  creator: { full_name: string } | null;
  case_id: string | null;
}
interface Profile { id: string; full_name: string; email: string; }

const STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

export default function TodosPage() {
  const { api } = useApi();
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('mine');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [form, setForm] = useState({
    title: '', task_type: 'temporary', status: 'pending',
    priority: 'medium', urgency: 'normal', importance: 'normal',
    owner_id: '', due_date: '', due_time: '', description: '',
    link_url: '', period_type: '', case_id: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter === 'mine') params.owner = 'me';
      if (typeFilter !== 'all') params.type = typeFilter;
      if (statusFilter !== 'all') params.status = statusFilter;
      const [tasksRes, profilesRes] = await Promise.all([
        api.getTasks(params),
        api.getProfiles(),
      ]);
      setTasks(tasksRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [api, filter, typeFilter, statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingTask(null);
    setForm({
      title: '', task_type: 'temporary', status: 'pending',
      priority: 'medium', urgency: 'normal', importance: 'normal',
      owner_id: profile?.id || '', due_date: '', due_time: '',
      description: '', link_url: '', period_type: '', case_id: '',
    });
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title, task_type: task.task_type, status: task.status,
      priority: task.priority, urgency: task.urgency, importance: task.importance,
      owner_id: task.owner?.id || '', due_date: task.due_date ? task.due_date.split('T')[0] : '',
      due_time: task.due_time || '', description: task.description || '',
      link_url: task.link_url || '', period_type: task.period_type || '', case_id: task.case_id || '',
    });
    setDialogOpen(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) return;
    const body: Record<string, unknown> = { ...form };
    if (form.owner_id) body.owner_id = form.owner_id;
    if (form.due_date) body.due_date = new Date(form.due_date).toISOString();
    // 清理空字符串字段
    for (const [key, value] of Object.entries(body)) {
      if (value === '') delete body[key];
    }

    try {
      if (editingTask) {
        await api.updateTask({ id: editingTask.id, ...body });
      } else {
        await api.createTask(body);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const updateTaskInline = async (id: string, updates: Record<string, unknown>) => {
    await api.updateTask({ id, ...updates });
    loadData();
  };

  const deleteTask = async (id: string) => {
    if (!confirm('确定删除该任务？')) return;
    await api.deleteTask(id);
    loadData();
  };

  const statusLabel = (s: string) => STATUS_OPTIONS.find(o => o.value === s)?.label || s;
  const priorityColor = (p: string) => {
    const map: Record<string, string> = { low: 'bg-slate-100 text-slate-600', medium: 'bg-blue-100 text-blue-700', high: 'bg-amber-100 text-amber-700', urgent: 'bg-red-100 text-red-700' };
    return map[p] || map.medium;
  };

  const filteredTasks = tasks;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">待办与提醒</h1>
          <p className="text-sm text-slate-500 mt-1">管理日常任务、定期任务和临时任务</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> 新建任务</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'mine' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            onClick={() => setFilter('mine')}>我的任务</button>
          <button className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
            onClick={() => setFilter('all')}>全部任务</button>
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-32 h-8"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="daily">每日提醒</SelectItem>
            <SelectItem value="periodic">定期任务</SelectItem>
            <SelectItem value="temporary">临时任务</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      ) : filteredTasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">暂无任务</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map(task => (
            <Card key={task.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => openEdit(task)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Status checkbox */}
                  <button
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${task.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-300 hover:border-indigo-400'}`}
                    onClick={(e) => { e.stopPropagation(); updateTaskInline(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' }); }}
                  >
                    {task.status === 'completed' && <span className="text-white text-xs">✓</span>}
                  </button>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-medium truncate ${task.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                        {task.title}
                      </p>
                      <Badge className={`text-[10px] border-0 ${priorityColor(task.priority)}`}>
                        {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}
                      </Badge>
                      {task.task_type === 'daily' && <Badge className="text-[10px] border-0 bg-purple-100 text-purple-700">每日</Badge>}
                      {task.task_type === 'periodic' && <Badge className="text-[10px] border-0 bg-cyan-100 text-cyan-700">定期</Badge>}
                      {task.importance === 'important' && <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">重要</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      {task.due_date && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('zh-CN')}
                          {task.due_time && ` ${task.due_time}`}
                        </span>
                      )}
                      {task.owner && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <User className="h-3 w-3" />{task.owner.full_name}
                        </span>
                      )}
                      {task.link_url && (
                        <a href={task.link_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-indigo-500 hover:underline" onClick={e => e.stopPropagation()}>
                          链接
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="flex items-center gap-2 shrink-0 w-32">
                    <Progress value={task.progress} className="h-1.5 flex-1" />
                    <span className="text-xs text-slate-400 w-8 text-right">{task.progress}%</span>
                  </div>

                  {/* Status */}
                  <Select value={task.status} onValueChange={(v) => updateTaskInline(task.id, { status: v })}>
                    <SelectTrigger className="w-20 h-7 text-xs" onClick={e => e.stopPropagation()}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>

                  {/* Delete */}
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600"
                    onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}>
                    ×
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingTask ? '编辑任务' : '新建任务'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="任务标题" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">任务类型</label>
                <Select value={form.task_type} onValueChange={v => setForm(f => ({ ...f, task_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每日提醒</SelectItem>
                    <SelectItem value="periodic">定期任务</SelectItem>
                    <SelectItem value="temporary">临时任务</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">重要程度</label>
                <Select value={form.importance} onValueChange={v => setForm(f => ({ ...f, importance: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="important">重要</SelectItem>
                    <SelectItem value="normal">一般</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">紧急程度</label>
                <Select value={form.urgency} onValueChange={v => setForm(f => ({ ...f, urgency: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgent">紧急</SelectItem>
                    <SelectItem value="normal">一般</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">优先级</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITY_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">负责人</label>
                <Select value={form.owner_id} onValueChange={v => setForm(f => ({ ...f, owner_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择负责人" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">截止日期</label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">截止时间</label>
                <Input type="time" value={form.due_time} onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
              </div>
            </div>

            {form.task_type === 'periodic' && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">周期</label>
                <Select value={form.period_type} onValueChange={v => setForm(f => ({ ...f, period_type: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择周期" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">每天</SelectItem>
                    <SelectItem value="weekly">每周</SelectItem>
                    <SelectItem value="monthly">每月</SelectItem>
                    <SelectItem value="quarterly">每季度</SelectItem>
                    <SelectItem value="yearly">每年</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs text-slate-500 mb-1 block">超链接</label>
              <Input placeholder="https://..." value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} />
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">备注</label>
              <textarea className="w-full h-20 px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="任务备注..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <Button onClick={saveTask} className="w-full">
              {editingTask ? '保存修改' : '创建任务'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
