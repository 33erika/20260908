'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Loader2, Briefcase, Calendar, User, FileText, Link as LinkIcon, Clock, AlertTriangle, MessageSquare, Trash2 } from 'lucide-react';

interface CaseItem {
  id: string; name: string; status: string; priority: string;
  start_date: string | null; due_date: string | null;
  description: string | null; opposing_party: string | null;
  related_department: string | null; resolution: string | null;
  closed_date: string | null; closure_method: string | null;
  is_settled: boolean; has_cost: boolean; cost_amount: string | null;
  final_result: string | null;
  case_types: { id: string; name: string } | null;
  case_stages: { id: string; name: string } | null;
  owner: { id: string; full_name: string } | null;
  creator: { full_name: string } | null;
  collaborators: string[] | null;
}
interface CaseType { id: string; name: string; case_type_fields: FieldDef[]; case_stages: StageDef[]; }
interface FieldDef { id: string; field_name: string; field_type: string; is_required: boolean; is_visible: boolean; options: string[] | null; }
interface StageDef { id: string; name: string; sort_order: number; }
interface Profile { id: string; full_name: string; }
interface Document { id: string; name: string; url: string; doc_type: string; uploader: { full_name: string } | null; created_at: string; }
interface Deadline {
  id: string; case_id: string; deadline_type: string; deadline_date: string;
  description: string | null; status: string;
  creator: { full_name: string } | null; created_at: string;
}
interface Progress {
  id: string; case_id: string; content: string; progress_date: string;
  creator: { full_name: string } | null; created_at: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: '待处理', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: '处理中', color: 'bg-blue-100 text-blue-700' },
  resolved: { label: '已解决', color: 'bg-green-100 text-green-700' },
  archived: { label: '已归档', color: 'bg-slate-200 text-slate-500' },
};

const DEADLINE_TYPES = ['答辩期', '举证期', '上诉期', '诉讼时效', '执行期限', '保全期限', '其他'];

export default function CasesPage() {
  const { api } = useApi();
  const { profile } = useAuth();
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [editingCase, setEditingCase] = useState<CaseItem | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [docs, setDocs] = useState<Document[]>([]);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [progressList, setProgressList] = useState<Progress[]>([]);
  const [deadlineForm, setDeadlineForm] = useState({ deadline_type: '答辩期', deadline_date: '', description: '' });
  const [progressContent, setProgressContent] = useState('');
  const [detailTab, setDetailTab] = useState<'info' | 'deadlines' | 'progress' | 'docs'>('info');

  const [form, setForm] = useState({
    name: '', case_type_id: '', status: 'pending', priority: 'medium',
    owner_id: '', opposing_party: '', related_department: '',
    description: '', start_date: '', due_date: '', current_stage_id: '',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { includeFields: 'true' };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter !== 'all') params.caseTypeId = typeFilter;
      const [casesRes, typesRes, profilesRes] = await Promise.all([
        api.getCases(params), api.getCaseTypes(), api.getProfiles(),
      ]);
      setCases(casesRes.data || []);
      setCaseTypes(typesRes.data || []);
      setProfiles(profilesRes.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [api, statusFilter, typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const selectedType = caseTypes.find(t => t.id === form.case_type_id);

  const openCreate = () => {
    setEditingCase(null);
    setForm({ name: '', case_type_id: caseTypes[0]?.id || '', status: 'pending', priority: 'medium', owner_id: profile?.id || '', opposing_party: '', related_department: '', description: '', start_date: '', due_date: '', current_stage_id: '' });
    setFieldValues({});
    setDialogOpen(true);
  };

  const openEdit = (c: CaseItem) => {
    setEditingCase(c);
    setForm({
      name: c.name, case_type_id: c.case_types?.id || '', status: c.status, priority: c.priority,
      owner_id: c.owner?.id || '', opposing_party: c.opposing_party || '',
      related_department: c.related_department || '', description: c.description || '',
      start_date: c.start_date ? c.start_date.split('T')[0] : '', due_date: c.due_date ? c.due_date.split('T')[0] : '',
      current_stage_id: c.case_stages?.id || '',
    });
    setFieldValues({});
    setDialogOpen(true);
  };

  const loadCaseDetails = async (caseId: string) => {
    try {
      const [docsRes, deadlinesRes, progressRes] = await Promise.all([
        api.getDocuments(caseId),
        api.getCaseDeadlines({ caseId }),
        api.getCaseProgress({ caseId }),
      ]);
      setDocs(docsRes.data || []);
      setDeadlines(deadlinesRes.data || []);
      setProgressList(progressRes.data || []);
    } catch { /* silent */ }
  };

  const openDetail = async (c: CaseItem) => {
    setSelectedCase(c);
    setDetailTab('info');
    setDetailOpen(true);
    await loadCaseDetails(c.id);
  };

  const saveCase = async () => {
    if (!form.name.trim() || !form.case_type_id) return;
    const body: Record<string, unknown> = { ...form };
    if (form.start_date) body.start_date = new Date(form.start_date).toISOString();
    if (form.due_date) body.due_date = new Date(form.due_date).toISOString();

    const fvArr = Object.entries(fieldValues).map(([field_id, value]) => ({ field_id, value }));
    if (fvArr.length > 0) body.field_values = fvArr;

    try {
      if (editingCase) {
        await api.updateCase({ id: editingCase.id, ...body });
      } else {
        await api.createCase(body);
      }
      setDialogOpen(false);
      loadData();
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const deleteCase = async (id: string) => {
    if (!confirm('确定删除该事项？')) return;
    await api.deleteCase(id);
    loadData();
  };

  const addDocument = async () => {
    if (!selectedCase) return;
    const name = prompt('文档名称');
    const url = prompt('钉钉文档链接');
    if (name && url) {
      await api.createDocument({ case_id: selectedCase.id, name, url, doc_type: 'other' });
      const res = await api.getDocuments(selectedCase.id);
      setDocs(res.data || []);
    }
  };

  const addDeadline = async () => {
    if (!selectedCase || !deadlineForm.deadline_date) return;
    await api.createCaseDeadline({
      case_id: selectedCase.id,
      deadline_type: deadlineForm.deadline_type,
      deadline_date: new Date(deadlineForm.deadline_date).toISOString(),
      description: deadlineForm.description || null,
    });
    setDeadlineForm({ deadline_type: '答辩期', deadline_date: '', description: '' });
    await loadCaseDetails(selectedCase.id);
  };

  const toggleDeadlineStatus = async (d: Deadline) => {
    const newStatus = d.status === 'completed' ? 'pending' : 'completed';
    await api.updateCaseDeadline({ id: d.id, status: newStatus });
    if (selectedCase) await loadCaseDetails(selectedCase.id);
  };

  const deleteDeadline = async (id: string) => {
    await api.deleteCaseDeadline(id);
    if (selectedCase) await loadCaseDetails(selectedCase.id);
  };

  const addProgress = async () => {
    if (!selectedCase || !progressContent.trim()) return;
    await api.createCaseProgress({
      case_id: selectedCase.id,
      content: progressContent,
      progress_date: new Date().toISOString(),
    });
    setProgressContent('');
    await loadCaseDetails(selectedCase.id);
  };

  const deleteProgress = async (id: string) => {
    await api.deleteCaseProgress(id);
    if (selectedCase) await loadCaseDetails(selectedCase.id);
  };

  const getDeadlineUrgency = (deadlineDate: string) => {
    const now = new Date();
    const dl = new Date(deadlineDate);
    const diffDays = Math.ceil((dl.getTime() - now.getTime()) / 86400000);
    if (diffDays < 0) return { label: '已逾期', color: 'text-red-600 bg-red-50', urgent: true };
    if (diffDays === 0) return { label: '今天到期', color: 'text-red-600 bg-red-50', urgent: true };
    if (diffDays <= 3) return { label: `${diffDays}天后`, color: 'text-amber-600 bg-amber-50', urgent: true };
    if (diffDays <= 7) return { label: `${diffDays}天后`, color: 'text-amber-600 bg-amber-50', urgent: false };
    return { label: `${diffDays}天后`, color: 'text-slate-500 bg-slate-50', urgent: false };
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">法务事项</h1>
          <p className="text-sm text-slate-500 mt-1">管理诉讼、仲裁、律师函等法律事项</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> 新增事项</Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40 h-8"><SelectValue placeholder="事项类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            {caseTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      ) : cases.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-slate-400">暂无事项</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {cases.map(c => (
            <Card key={c.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openDetail(c)}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
                      <Badge className={`text-[10px] border-0 ${STATUS_MAP[c.status]?.color || ''}`}>
                        {STATUS_MAP[c.status]?.label || c.status}
                      </Badge>
                      {c.priority === 'urgent' && <Badge className="text-[10px] border-0 bg-red-100 text-red-700">紧急</Badge>}
                      {c.priority === 'high' && <Badge className="text-[10px] border-0 bg-amber-100 text-amber-700">高</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{c.case_types?.name || '-'}</span>
                      {c.case_stages && <span>阶段: {c.case_stages.name}</span>}
                      {c.owner && <span className="flex items-center gap-1"><User className="h-3 w-3" />{c.owner.full_name}</span>}
                      {c.opposing_party && <span>对方: {c.opposing_party}</span>}
                      {c.due_date && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(c.due_date).toLocaleDateString('zh-CN')}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>编辑</Button>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={(e) => { e.stopPropagation(); deleteCase(c.id); }}>×</Button>
                  </div>
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
            <DialogTitle>{editingCase ? '编辑事项' : '新增事项'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="事项名称" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">事项类型</label>
                <Select value={form.case_type_id} onValueChange={v => setForm(f => ({ ...f, case_type_id: v, current_stage_id: '' }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {caseTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">负责人</label>
                <Select value={form.owner_id} onValueChange={v => setForm(f => ({ ...f, owner_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {profiles.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">状态</label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">优先级</label>
                <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">低</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="urgent">紧急</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedType && selectedType.case_stages.length > 0 && (
              <div>
                <label className="text-xs text-slate-500 mb-1 block">当前阶段</label>
                <Select value={form.current_stage_id} onValueChange={v => setForm(f => ({ ...f, current_stage_id: v }))}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择阶段" /></SelectTrigger>
                  <SelectContent>
                    {selectedType.case_stages.sort((a, b) => a.sort_order - b.sort_order).map(s =>
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="对方当事人" value={form.opposing_party} onChange={e => setForm(f => ({ ...f, opposing_party: e.target.value }))} />
              <Input placeholder="相关部门" value={form.related_department} onChange={e => setForm(f => ({ ...f, related_department: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">开始日期</label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">截止日期</label>
                <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>
            {selectedType && selectedType.case_type_fields.filter(f => f.is_visible).map(field => (
              <div key={field.id}>
                <label className="text-xs text-slate-500 mb-1 block">
                  {field.field_name} {field.is_required && <span className="text-red-500">*</span>}
                </label>
                {field.field_type === 'select' && field.options ? (
                  <Select value={fieldValues[field.id] || ''} onValueChange={v => setFieldValues(fv => ({ ...fv, [field.id]: v }))}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(field.options as string[]).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : field.field_type === 'textarea' ? (
                  <textarea className="w-full h-20 px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={fieldValues[field.id] || ''} onChange={e => setFieldValues(fv => ({ ...fv, [field.id]: e.target.value }))} />
                ) : (
                  <Input type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                    value={fieldValues[field.id] || ''} onChange={e => setFieldValues(fv => ({ ...fv, [field.id]: e.target.value }))} />
                )}
              </div>
            ))}
            <div>
              <label className="text-xs text-slate-500 mb-1 block">事项描述</label>
              <textarea className="w-full h-20 px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <Button onClick={saveCase} className="w-full">{editingCase ? '保存修改' : '创建事项'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog with Tabs */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedCase?.name}
              {selectedCase && <Badge className={`text-[10px] border-0 ${STATUS_MAP[selectedCase.status]?.color}`}>
                {STATUS_MAP[selectedCase.status]?.label}
              </Badge>}
            </DialogTitle>
          </DialogHeader>
          {selectedCase && (
            <div className="space-y-4 pt-2">
              {/* Tab Navigation */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                {([
                  { key: 'info', label: '基本信息', icon: Briefcase },
                  { key: 'deadlines', label: '法律期限', icon: Clock },
                  { key: 'progress', label: '进展记录', icon: MessageSquare },
                  { key: 'docs', label: '材料文档', icon: FileText },
                ] as const).map(tab => (
                  <button key={tab.key}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex-1 justify-center ${detailTab === tab.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setDetailTab(tab.key)}>
                    <tab.icon className="h-3.5 w-3.5" />{tab.label}
                  </button>
                ))}
              </div>

              {/* Info Tab */}
              {detailTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500">事项类型：</span>{selectedCase.case_types?.name}</div>
                    <div><span className="text-slate-500">负责人：</span>{selectedCase.owner?.full_name}</div>
                    <div><span className="text-slate-500">当前阶段：</span>{selectedCase.case_stages?.name || '-'}</div>
                    <div><span className="text-slate-500">对方当事人：</span>{selectedCase.opposing_party || '-'}</div>
                    <div><span className="text-slate-500">相关部门：</span>{selectedCase.related_department || '-'}</div>
                    <div><span className="text-slate-500">优先级：</span>{selectedCase.priority}</div>
                    <div><span className="text-slate-500">开始日期：</span>{selectedCase.start_date ? new Date(selectedCase.start_date).toLocaleDateString('zh-CN') : '-'}</div>
                    <div><span className="text-slate-500">截止日期：</span>{selectedCase.due_date ? new Date(selectedCase.due_date).toLocaleDateString('zh-CN') : '-'}</div>
                  </div>
                  {selectedCase.description && (
                    <div><p className="text-xs text-slate-500 mb-1">事项描述</p><p className="text-sm text-slate-700">{selectedCase.description}</p></div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => { setDetailOpen(false); openEdit(selectedCase); }}>编辑事项</Button>
                  </div>
                </div>
              )}

              {/* Deadlines Tab */}
              {detailTab === 'deadlines' && (
                <div className="space-y-4">
                  {/* Add Deadline Form */}
                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">期限类型</label>
                      <Select value={deadlineForm.deadline_type} onValueChange={v => setDeadlineForm(f => ({ ...f, deadline_type: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {DEADLINE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">截止日期</label>
                      <Input type="date" value={deadlineForm.deadline_date} onChange={e => setDeadlineForm(f => ({ ...f, deadline_date: e.target.value }))} className="h-9" />
                    </div>
                    <Button size="sm" className="h-9" onClick={addDeadline}><Plus className="h-3 w-3 mr-1" />添加</Button>
                  </div>

                  {/* Deadline List */}
                  {deadlines.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">暂无法律期限</div>
                  ) : (
                    <div className="space-y-2">
                      {deadlines.map(d => {
                        const urgency = getDeadlineUrgency(d.deadline_date);
                        return (
                          <div key={d.id} className={`flex items-center gap-3 p-3 rounded-lg border ${d.status === 'completed' ? 'border-green-200 bg-green-50/50' : urgency.urgent ? 'border-red-200 bg-red-50/30' : 'border-slate-100'}`}>
                            <button onClick={() => toggleDeadlineStatus(d)}
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${d.status === 'completed' ? 'border-green-500 bg-green-500' : 'border-slate-300 hover:border-indigo-400'}`}>
                              {d.status === 'completed' && <span className="text-white text-xs">✓</span>}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${d.status === 'completed' ? 'line-through text-slate-400' : 'text-slate-900'}`}>{d.deadline_type}</span>
                                <Badge className={`text-[10px] border-0 ${urgency.color}`}>{urgency.label}</Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(d.deadline_date).toLocaleDateString('zh-CN')}</span>
                                {d.description && <span className="truncate">{d.description}</span>}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-500" onClick={() => deleteDeadline(d.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Progress Tab */}
              {detailTab === 'progress' && (
                <div className="space-y-4">
                  {/* Add Progress */}
                  <div className="flex gap-2">
                    <textarea className="flex-1 h-20 px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="记录案件进展..." value={progressContent} onChange={e => setProgressContent(e.target.value)} />
                    <Button size="sm" className="self-end h-9" onClick={addProgress}><Plus className="h-3 w-3 mr-1" />添加</Button>
                  </div>

                  {/* Timeline */}
                  {progressList.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">暂无进展记录</div>
                  ) : (
                    <div className="relative pl-6 space-y-4">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
                      {progressList.map(p => (
                        <div key={p.id} className="relative">
                          <div className="absolute -left-4 top-1.5 w-3 h-3 rounded-full bg-indigo-500 border-2 border-white" />
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-500">
                                {p.creator?.full_name || '-'} · {new Date(p.progress_date).toLocaleString('zh-CN')}
                              </span>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500" onClick={() => deleteProgress(p.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-slate-700">{p.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Documents Tab */}
              {detailTab === 'docs' && (
                <div className="space-y-4">
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={addDocument}><LinkIcon className="h-3 w-3 mr-1" /> 关联文档</Button>
                  </div>
                  {docs.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">暂无关联文档</div>
                  ) : (
                    <div className="space-y-1">
                      {docs.map(d => (
                        <a key={d.id} href={d.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 p-3 rounded-lg hover:bg-slate-50 text-sm border border-slate-100">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-700">{d.name}</span>
                          <span className="text-xs text-slate-400 ml-auto">{new Date(d.created_at).toLocaleDateString('zh-CN')}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
