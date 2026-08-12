'use client';

import { useState, useEffect, useCallback } from 'react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Loader2, Settings, Users, FileText, Clock } from 'lucide-react';

interface CaseType { id: string; name: string; description: string | null; case_type_fields: FieldDef[]; case_stages: StageDef[]; }
interface FieldDef { id: string; field_name: string; field_type: string; is_required: boolean; is_visible: boolean; options: string[] | null; sort_order: number; }
interface StageDef { id: string; name: string; sort_order: number; }
interface Profile { id: string; full_name: string; email: string; role: string; }
interface OpLog { id: string; action: string; entity_type: string; entity_name: string; created_at: string; user: { full_name: string } | null; }

export default function SettingsPage() {
  const { api } = useApi();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'types' | 'users' | 'logs'>('types');
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<OpLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [fieldDialogOpen, setFieldDialogOpen] = useState(false);
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [editingTypeId, setEditingTypeId] = useState('');
  const [typeName, setTypeName] = useState('');
  const [typeDesc, setTypeDesc] = useState('');
  const [fieldForm, setFieldForm] = useState({ field_name: '', field_type: 'text', is_required: false, options: '' });
  const [stageName, setStageName] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [typesRes, profilesRes, logsRes] = await Promise.all([
        api.getCaseTypes(), api.getProfiles(), api.getOperationLogs({ limit: '30' }),
      ]);
      setCaseTypes(typesRes.data || []);
      setProfiles(profilesRes.data || []);
      setLogs(logsRes.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const createType = async () => {
    if (!typeName.trim()) return;
    await api.createCaseTypeItem({ action: 'create_type', name: typeName, description: typeDesc });
    setTypeDialogOpen(false); setTypeName(''); setTypeDesc('');
    loadData();
  };

  const createField = async () => {
    if (!fieldForm.field_name.trim() || !editingTypeId) return;
    const body: Record<string, unknown> = {
      action: 'create_field', case_type_id: editingTypeId,
      field_name: fieldForm.field_name, field_type: fieldForm.field_type,
      is_required: fieldForm.is_required,
    };
    if (fieldForm.field_type === 'select' && fieldForm.options) {
      body.options = fieldForm.options.split(',').map(s => s.trim()).filter(Boolean);
    }
    await api.createCaseTypeItem(body);
    setFieldDialogOpen(false);
    setFieldForm({ field_name: '', field_type: 'text', is_required: false, options: '' });
    loadData();
  };

  const createStage = async () => {
    if (!stageName.trim() || !editingTypeId) return;
    await api.createCaseTypeItem({ action: 'create_stage', case_type_id: editingTypeId, name: stageName });
    setStageDialogOpen(false); setStageName('');
    loadData();
  };

  const deleteField = async (id: string) => {
    await api.deleteCaseTypeItem('field', id);
    loadData();
  };

  const deleteStage = async (id: string) => {
    await api.deleteCaseTypeItem('stage', id);
    loadData();
  };

  const tabs = [
    { key: 'types' as const, label: '事项类型配置', icon: FileText },
    { key: 'users' as const, label: '用户管理', icon: Users },
    { key: 'logs' as const, label: '操作记录', icon: Clock },
  ];

  const ACTION_LABELS: Record<string, string> = {
    create: '创建', update: '修改', delete: '删除', restore: '恢复', archive: '归档',
  };
  const ENTITY_LABELS: Record<string, string> = {
    case: '事项', task: '任务', nav_link: '导航链接', nav_category: '导航分类', document: '文档',
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">系统设置</h1>
        <p className="text-sm text-slate-500 mt-1">管理事项类型、用户和操作记录</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit">
        {tabs.map(tab => (
          <button key={tab.key}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
            onClick={() => setActiveTab(tab.key)}>
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-indigo-600" /></div>
      ) : (
        <>
          {/* Case Types Tab */}
          {activeTab === 'types' && (
            <div className="space-y-4">
              <Button onClick={() => { setTypeName(''); setTypeDesc(''); setTypeDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> 新增事项类型
              </Button>

              {caseTypes.map(ct => (
                <Card key={ct.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{ct.name}</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setEditingTypeId(ct.id); setFieldForm({ field_name: '', field_type: 'text', is_required: false, options: '' }); setFieldDialogOpen(true); }}>
                          <Plus className="h-3 w-3 mr-1" /> 自定义字段
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setEditingTypeId(ct.id); setStageName(''); setStageDialogOpen(true); }}>
                          <Plus className="h-3 w-3 mr-1" /> 阶段
                        </Button>
                      </div>
                    </div>
                    {ct.description && <p className="text-xs text-slate-400">{ct.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Custom Fields */}
                    {ct.case_type_fields.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">自定义字段</p>
                        <div className="flex flex-wrap gap-2">
                          {ct.case_type_fields.map(f => (
                            <Badge key={f.id} className="bg-slate-100 text-slate-600 border-0 text-xs gap-1">
                              {f.field_name}
                              <span className="text-slate-400">({f.field_type})</span>
                              {f.is_required && <span className="text-red-500">*</span>}
                              <button onClick={() => deleteField(f.id)} className="ml-1 hover:text-red-500">×</button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Stages */}
                    {ct.case_stages.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">阶段流程</p>
                        <div className="flex items-center gap-1 flex-wrap">
                          {ct.case_stages.sort((a, b) => a.sort_order - b.sort_order).map((s, i) => (
                            <span key={s.id} className="flex items-center gap-1">
                              <Badge className="bg-indigo-50 text-indigo-700 border-0 text-xs gap-1">
                                {s.name}
                                <button onClick={() => deleteStage(s.id)} className="ml-1 hover:text-red-500">×</button>
                              </Badge>
                              {i < ct.case_stages.length - 1 && <span className="text-slate-300">→</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left p-4 font-medium text-slate-500">姓名</th>
                      <th className="text-left p-4 font-medium text-slate-500">邮箱</th>
                      <th className="text-left p-4 font-medium text-slate-500">角色</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map(p => (
                      <tr key={p.id} className="border-b border-slate-50">
                        <td className="p-4 font-medium text-slate-900">{p.full_name}</td>
                        <td className="p-4 text-slate-500">{p.email}</td>
                        <td className="p-4">
                          <Badge className={`text-xs border-0 ${p.role === 'admin' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                            {p.role === 'admin' ? '管理员' : '法务成员'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <Card>
              <CardContent className="p-0">
                {logs.length === 0 ? (
                  <div className="py-12 text-center text-slate-400">暂无操作记录</div>
                ) : (
                  <div className="divide-y divide-slate-50">
                    {logs.map(log => (
                      <div key={log.id} className="p-4 flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          {log.user?.full_name?.charAt(0) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">
                            <span className="font-medium">{log.user?.full_name}</span>
                            {' '}{ACTION_LABELS[log.action] || log.action}了
                            {' '}{ENTITY_LABELS[log.entity_type] || log.entity_type}
                            {log.entity_name && <span className="font-medium">「{log.entity_name}」</span>}
                          </p>
                          <p className="text-xs text-slate-400">{new Date(log.created_at).toLocaleString('zh-CN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Create Type Dialog */}
      <Dialog open={typeDialogOpen} onOpenChange={setTypeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>新增事项类型</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="类型名称" value={typeName} onChange={e => setTypeName(e.target.value)} />
            <Input placeholder="描述（可选）" value={typeDesc} onChange={e => setTypeDesc(e.target.value)} />
            <Button onClick={createType} className="w-full">创建</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Field Dialog */}
      <Dialog open={fieldDialogOpen} onOpenChange={setFieldDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加自定义字段</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="字段名称" value={fieldForm.field_name} onChange={e => setFieldForm(f => ({ ...f, field_name: e.target.value }))} />
            <Select value={fieldForm.field_type} onValueChange={v => setFieldForm(f => ({ ...f, field_type: v }))}>
              <SelectTrigger><SelectValue placeholder="字段类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="text">文本</SelectItem>
                <SelectItem value="textarea">多行文本</SelectItem>
                <SelectItem value="number">数字</SelectItem>
                <SelectItem value="date">日期</SelectItem>
                <SelectItem value="select">下拉选择</SelectItem>
              </SelectContent>
            </Select>
            {fieldForm.field_type === 'select' && (
              <Input placeholder="选项（逗号分隔）" value={fieldForm.options} onChange={e => setFieldForm(f => ({ ...f, options: e.target.value }))} />
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={fieldForm.is_required} onChange={e => setFieldForm(f => ({ ...f, is_required: e.target.checked }))} />
              是否必填
            </label>
            <Button onClick={createField} className="w-full">添加</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Stage Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加阶段</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <Input placeholder="阶段名称" value={stageName} onChange={e => setStageName(e.target.value)} />
            <Button onClick={createStage} className="w-full">添加</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
