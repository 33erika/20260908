'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  task_type: string;
  status: string;
  priority: string;
  urgency: string;
  importance: string;
  progress: number;
  due_date: string | null;
  due_time: string | null;
  description: string | null;
  link_url: string | null;
  period_type: string | null;
  owner: { id: string; full_name: string } | null;
  creator: { full_name: string } | null;
  case_id: string | null;
}
interface Profile { id: string; full_name: string; email: string; }
interface CaseItem { id: string; title: string; }

const STATUS_OPTIONS = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'cancelled', label: '已取消' },
];

export default function TodosPage() {
  const { api } = useApi();
  const { profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [quadrantOpen, setQuadrantOpen] = useState(true);

  const [form, setForm] = useState({
    title: '', task_type: 'temporary', status: 'pending',
    importance: 'normal', urgency: 'normal',
    owner_id: '', due_date: '', due_time: '18:00',
    description: '', period_type: '', case_id: '',
    progress: 0,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter === 'mine') params.owner = 'me';
      if (typeFilter !== 'all') params.type = typeFilter;
      const [tasksRes, profilesRes, casesRes] = await Promise.all([
        api.getTasks(params),
        api.getProfiles(),
        api.getCases({}),
      ]);
      setTasks(tasksRes.data || []);
      setProfiles(profilesRes.data || []);
      setCases(casesRes.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [api, filter, typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const openCreate = () => {
    setEditingTask(null);
    setForm({
      title: '', task_type: 'temporary', status: 'pending',
      importance: 'normal', urgency: 'normal',
      owner_id: profile?.id || '', due_date: '', due_time: '18:00',
      description: '', period_type: '', case_id: '',
      progress: 0,
    });
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditingTask(task);
    setForm({
      title: task.title, task_type: task.task_type, status: task.status,
      importance: task.importance, urgency: task.urgency,
      owner_id: task.owner?.id || '', due_date: task.due_date ? task.due_date.split('T')[0] : '',
      due_time: task.due_time || '18:00', description: task.description || '',
      period_type: task.period_type || '', case_id: task.case_id || '',
      progress: task.progress || 0,
    });
    setDialogOpen(true);
  };

  const saveTask = async () => {
    if (!form.title.trim()) return;
    const body: Record<string, unknown> = { ...form };
    if (form.owner_id) body.owner_id = form.owner_id;
    if (form.due_date) body.due_date = new Date(form.due_date).toISOString();
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

  // Classify tasks into quadrants
  const isImportant = (t: Task) => t.importance === 'important';
  const isUrgent = (t: Task) => t.urgency === 'urgent';

  const qImportantUrgent = tasks.filter(t => isImportant(t) && isUrgent(t));
  const qImportantNotUrgent = tasks.filter(t => isImportant(t) && !isUrgent(t));
  const qUrgentNotImportant = tasks.filter(t => !isImportant(t) && isUrgent(t));
  const qNotImportantNotUrgent = tasks.filter(t => !isImportant(t) && !isUrgent(t));

  // Task list items (all tasks for the list below quadrants)
  const listTasks = tasks;

  const isOverdue = (t: Task) => {
    if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
    return new Date(t.due_date) < new Date(new Date().toDateString());
  };

  const overdueDays = (t: Task) => {
    if (!t.due_date) return 0;
    const due = new Date(t.due_date);
    const now = new Date(new Date().toDateString());
    const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const taskTypeLabel = (type: string) => {
    const map: Record<string, string> = { temporary: '临时任务', daily: '每日提醒', periodic: '定期任务' };
    return map[type] || type;
  };

  const getDotColor = (t: Task) => {
    if (isImportant(t) && isUrgent(t)) return 'bg-red-500';
    if (isImportant(t)) return 'bg-amber-500';
    if (isUrgent(t)) return 'bg-blue-500';
    return 'bg-slate-300';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">待办与提醒</h1>
          <p className="text-sm text-slate-500 mt-1">每日提醒·定期任务·临时任务</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Filter: All / Mine */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setFilter('all')}
            >
              全部
            </button>
            <button
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'mine' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setFilter('mine')}
            >
              我的
            </button>
          </div>

          {/* Filter: Type */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === 'all' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setTypeFilter('all')}
            >
              全部类型
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === 'temporary' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setTypeFilter('temporary')}
            >
              临时
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === 'daily' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setTypeFilter('daily')}
            >
              每日
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${typeFilter === 'periodic' ? 'bg-white shadow-sm text-slate-900 ring-1 ring-slate-300' : 'text-slate-500 hover:text-slate-700'}`}
              onClick={() => setTypeFilter('periodic')}
            >
              定期
            </button>
          </div>

          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-1" /> 新建任务
          </Button>
        </div>
      </div>

      {/* Four Quadrants - Eisenhower Matrix */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">重要 × 紧急 四象限</h2>
            <button
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              onClick={() => setQuadrantOpen(!quadrantOpen)}
            >
              {quadrantOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {quadrantOpen ? '收起' : '展开'}
            </button>
          </div>

          {quadrantOpen && (
            <div className="grid grid-cols-2 gap-4">
              {/* Q1: Important & Urgent */}
              <div className="rounded-lg bg-red-50 border border-red-100 p-4 min-h-[140px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="text-sm font-semibold text-red-700">重要且紧急</span>
                  </div>
                  <span className="text-xs font-medium bg-white text-red-600 rounded-full w-6 h-6 flex items-center justify-center border border-red-200">
                    {qImportantUrgent.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {qImportantUrgent.map(t => (
                    <div key={t.id} className="text-sm text-slate-700 bg-white/60 rounded px-2.5 py-1.5 cursor-pointer hover:bg-white/90 transition-colors" onClick={() => openEdit(t)}>
                      {t.title}
                    </div>
                  ))}
                  {qImportantUrgent.length === 0 && <p className="text-xs text-slate-400">暂无任务</p>}
                </div>
              </div>

              {/* Q2: Important Not Urgent */}
              <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 min-h-[140px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm font-semibold text-amber-700">重要不紧急</span>
                  </div>
                  <span className="text-xs font-medium bg-white text-amber-600 rounded-full w-6 h-6 flex items-center justify-center border border-amber-200">
                    {qImportantNotUrgent.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {qImportantNotUrgent.map(t => (
                    <div key={t.id} className="text-sm text-slate-700 bg-white/60 rounded px-2.5 py-1.5 cursor-pointer hover:bg-white/90 transition-colors" onClick={() => openEdit(t)}>
                      {t.title}
                    </div>
                  ))}
                  {qImportantNotUrgent.length === 0 && <p className="text-xs text-slate-400">暂无任务</p>}
                </div>
              </div>

              {/* Q3: Urgent Not Important */}
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-4 min-h-[140px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-sm font-semibold text-orange-600">紧急不重要</span>
                  </div>
                  <span className="text-xs font-medium bg-white text-blue-600 rounded-full w-6 h-6 flex items-center justify-center border border-blue-200">
                    {qUrgentNotImportant.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {qUrgentNotImportant.map(t => (
                    <div key={t.id} className="text-sm text-slate-700 bg-white/60 rounded px-2.5 py-1.5 cursor-pointer hover:bg-white/90 transition-colors" onClick={() => openEdit(t)}>
                      {t.title}
                    </div>
                  ))}
                  {qUrgentNotImportant.length === 0 && <p className="text-xs text-slate-400">暂无任务</p>}
                </div>
              </div>

              {/* Q4: Not Important Not Urgent */}
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 min-h-[140px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-sm font-semibold text-slate-600">不重要不紧急</span>
                  </div>
                  <span className="text-xs font-medium bg-white text-slate-500 rounded-full w-6 h-6 flex items-center justify-center border border-slate-200">
                    {qNotImportantNotUrgent.length}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {qNotImportantNotUrgent.map(t => (
                    <div key={t.id} className="text-sm text-slate-700 bg-white/60 rounded px-2.5 py-1.5 cursor-pointer hover:bg-white/90 transition-colors" onClick={() => openEdit(t)}>
                      {t.title}
                    </div>
                  ))}
                  {qNotImportantNotUrgent.length === 0 && <p className="text-xs text-slate-400">暂无任务</p>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>
      ) : listTasks.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">暂无任务</CardContent></Card>
      ) : (
        <div className="space-y-1">
          {listTasks.map(task => {
            const overdue = isOverdue(task);
            const days = overdueDays(task);
            return (
              <Card key={task.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {/* Dot + Checkbox */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`w-2.5 h-2.5 rounded-full ${getDotColor(task)}`} />
                      <button
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          task.status === 'completed'
                            ? 'bg-green-500 border-green-500'
                            : 'border-slate-300 hover:border-blue-400'
                        }`}
                        onClick={() => updateTaskInline(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' })}
                      >
                        {task.status === 'completed' && <span className="text-white text-xs">✓</span>}
                      </button>
                    </div>

                    {/* Title + Tags */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-slate-400' : overdue ? 'text-red-600' : 'text-slate-900'}`}>
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {overdue && (
                          <Badge className="text-[10px] border-0 bg-red-100 text-red-600">
                            逾期 {days} 天
                          </Badge>
                        )}
                        {task.owner && (
                          <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600">
                            {task.owner.full_name}
                          </Badge>
                        )}
                        <Badge className="text-[10px] border-0 bg-slate-100 text-slate-500">
                          {taskTypeLabel(task.task_type)}
                        </Badge>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="flex items-center gap-2 shrink-0 w-36">
                      <Progress value={task.progress} className="h-1.5 flex-1" />
                      <span className="text-xs text-slate-400 w-8 text-right">{task.progress}%</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                        onClick={() => openEdit(task)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                        onClick={() => deleteTask(task.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{editingTask ? '编辑任务' : '新建任务'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Task Title */}
            <div>
              <label className="text-sm text-slate-700 mb-1.5 block">任务标题 <span className="text-red-500">*</span></label>
              <Input
                placeholder="如：收集张三劳动合同"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="h-10"
              />
            </div>

            {/* Task Type - Radio */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">任务类型</label>
              <div className="flex items-center gap-5">
                {[
                  { value: 'temporary', label: '临时任务' },
                  { value: 'daily', label: '每日提醒' },
                  { value: 'periodic', label: '定期任务' },
                ].map(opt => (
                  <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                        form.task_type === opt.value ? 'border-blue-600' : 'border-slate-300'
                      }`}
                      onClick={() => setForm(f => ({ ...f, task_type: opt.value }))}
                    >
                      {form.task_type === opt.value && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </span>
                    <span className="text-sm text-slate-700" onClick={() => setForm(f => ({ ...f, task_type: opt.value }))}>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Owner + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700 mb-1.5 block">负责人</label>
                <Select value={form.owner_id} onValueChange={v => setForm(f => ({ ...f, owner_id: v }))}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="选择负责人" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm text-slate-700 mb-1.5 block">状态</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Due Date + Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-700 mb-1.5 block">截止日期</label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div>
                <label className="text-sm text-slate-700 mb-1.5 block">截止时间</label>
                <Input
                  type="time"
                  value={form.due_time}
                  onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            {/* Important / Urgent Checkboxes */}
            <div>
              <label className="text-sm text-slate-700 mb-2 block">重要 / 紧急</label>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.importance === 'important'}
                    onChange={e => setForm(f => ({ ...f, importance: e.target.checked ? 'important' : 'normal' }))}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">重要</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.urgency === 'urgent'}
                    onChange={e => setForm(f => ({ ...f, urgency: e.target.checked ? 'urgent' : 'normal' }))}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">紧急</span>
                </label>
              </div>
            </div>

            {/* Progress Slider */}
            <div>
              <label className="text-sm text-slate-700 mb-1.5 block">进度：{form.progress}%</label>
              <Slider
                value={[form.progress]}
                onValueChange={v => setForm(f => ({ ...f, progress: v[0] }))}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {/* Related Case */}
            <div>
              <label className="text-sm text-slate-700 mb-1.5 block">所属案件</label>
              <Select value={form.case_id || 'none'} onValueChange={v => setForm(f => ({ ...f, case_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="h-10"><SelectValue placeholder="不关联案件" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">不关联案件</SelectItem>
                  {cases.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-slate-700 mb-1.5 block">备注</label>
              <Textarea
                placeholder="任务说明、备注等"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="h-20 resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={saveTask} className="bg-blue-600 hover:bg-blue-700" disabled={!form.title.trim()}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
