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
import { Plus, Pencil, Trash2, Loader2, Settings, Users, FileText, Clock, Database, Download, Upload, AlertTriangle, CheckCircle2, Bell, ShieldCheck } from 'lucide-react';

interface CaseType { id: string; name: string; description: string | null; case_type_fields: FieldDef[]; case_stages: StageDef[]; }
interface FieldDef { id: string; field_name: string; field_type: string; is_required: boolean; is_visible: boolean; options: string[] | null; sort_order: number; }
interface StageDef { id: string; name: string; sort_order: number; }
interface Profile { id: string; full_name: string; email: string; role: string; }
interface OpLog { id: string; action: string; entity_type: string; entity_name: string; created_at: string; user: { full_name: string } | null; }
interface ReminderRule { id: string; rule_name: string; time_before: number; time_unit: string; is_enabled: boolean; sort_order: number; }
interface AllowedEmail { id: string; email: string; created_at: string; created_by: string | null; profiles: { full_name: string } | null; }

export default function SettingsPage() {
  const { api } = useApi();
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'types' | 'users' | 'whitelist' | 'logs' | 'data' | 'reminders'>('types');
  const [caseTypes, setCaseTypes] = useState<CaseType[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<OpLog[]>([]);
  const [reminderRules, setReminderRules] = useState<ReminderRule[]>([]);
  const [allowedEmails, setAllowedEmails] = useState<AllowedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user dialog state
  const [createUserDialogOpen, setCreateUserDialogOpen] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({ email: '', fullName: '', password: '' });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [createUserSuccess, setCreateUserSuccess] = useState('');

  // Data management state
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [dataMessage, setDataMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);

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
      const [typesRes, profilesRes, logsRes, rulesRes, whitelistRes] = await Promise.all([
        api.getCaseTypes(), api.getProfiles(), api.getOperationLogs({ limit: '30' }),
        api.getReminderRules(), api.getAllowedEmails(),
      ]);
      setCaseTypes(typesRes.data || []);
      setProfiles(profilesRes.data || []);
      setLogs(logsRes.data || []);
      setReminderRules(rulesRes.data || []);
      setAllowedEmails(whitelistRes.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  const createType = async () => {
    if (!typeName.trim()) return;
    try {
      await api.createCaseTypeItem({ action: 'create_type', name: typeName, description: typeDesc });
      setTypeDialogOpen(false); setTypeName(''); setTypeDesc('');
      loadData();
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
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
    try {
      await api.createCaseTypeItem(body);
      setFieldDialogOpen(false);
      setFieldForm({ field_name: '', field_type: 'text', is_required: false, options: '' });
      loadData();
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
  };

  const createStage = async () => {
    if (!stageName.trim() || !editingTypeId) return;
    try {
      await api.createCaseTypeItem({ action: 'create_stage', case_type_id: editingTypeId, name: stageName });
      setStageDialogOpen(false); setStageName('');
      loadData();
    } catch (err) {
      alert(`保存失败：${err instanceof Error ? err.message : '未知错误'}`);
    }
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
    { key: 'whitelist' as const, label: '注册白名单', icon: ShieldCheck },
    { key: 'reminders' as const, label: '提醒规则', icon: Bell },
    { key: 'logs' as const, label: '操作记录', icon: Clock },
    { key: 'data' as const, label: '数据管理', icon: Database },
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
        <p className="text-sm text-slate-500 mt-1">管理事项类型、用户、操作记录和数据备份</p>
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

          {/* Whitelist Tab */}
          {activeTab === 'whitelist' && (
            <div className="space-y-4">
              {/* Status messages */}
              {createUserSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  {createUserSuccess}
                </div>
              )}

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-indigo-600" />
                        账号管理
                      </CardTitle>
                      <p className="text-xs text-slate-500 mt-1">
                        创建新账号并自动加入白名单。此功能为钉钉登录上线前的临时过渡方案。
                      </p>
                    </div>
                    <Button onClick={() => { setCreateUserForm({ email: '', fullName: '', password: '' }); setCreateUserError(''); setCreateUserSuccess(''); setCreateUserDialogOpen(true); }}>
                      <Plus className="h-4 w-4 mr-1" /> 创建账号
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Whitelist table */}
                  {allowedEmails.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm">暂无账号，请点击"创建账号"添加</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left p-3 font-medium text-slate-500">邮箱</th>
                          <th className="text-left p-3 font-medium text-slate-500">添加时间</th>
                          <th className="text-right p-3 font-medium text-slate-500">操作</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allowedEmails.map(item => (
                          <tr key={item.id} className="border-b border-slate-50">
                            <td className="p-3 font-medium text-slate-900">{item.email}</td>
                            <td className="p-3 text-slate-500 text-xs">{new Date(item.created_at).toLocaleString('zh-CN')}</td>
                            <td className="p-3 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-7"
                                onClick={async () => {
                                  if (!confirm(`确认将 ${item.email} 从白名单中移除？该用户将无法登录。`)) return;
                                  try {
                                    await api.removeAllowedEmail(item.id);
                                    loadData();
                                  } catch (err) {
                                    alert(err instanceof Error ? err.message : '删除失败');
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
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

          {/* Reminders Tab */}
          {activeTab === 'reminders' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Bell className="h-4 w-4 text-indigo-600" />
                  提醒规则配置
                </CardTitle>
                <p className="text-xs text-slate-500">配置任务/期限到期前的提醒时间，每条规则可独立开关。</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {reminderRules.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-sm">暂无提醒规则</div>
                ) : (
                  reminderRules.map(rule => (
                    <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${rule.is_enabled ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <div>
                          <p className={`text-sm font-medium ${rule.is_enabled ? 'text-slate-900' : 'text-slate-400'}`}>{rule.rule_name}</p>
                          <p className="text-xs text-slate-500">
                            {rule.time_before < 0 ? `逾期${Math.abs(rule.time_before)}${rule.time_unit === 'hour' ? '小时' : '天'}` :
                              rule.time_before === 0 ? '截止当天' :
                              `截止前 ${rule.time_before} ${rule.time_unit === 'hour' ? '小时' : '天'}`}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          await api.updateReminderRule({ action: 'toggle', id: rule.id, is_enabled: !rule.is_enabled });
                          const res = await api.getReminderRules();
                          setReminderRules(res.data || []);
                        }}
                        className={`relative w-10 h-5 rounded-full transition-colors ${rule.is_enabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${rule.is_enabled ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* Status message */}
              {dataMessage && (
                <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                  dataMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                  {dataMessage.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {dataMessage.text}
                </div>
              )}

              {/* Export */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-600" />
                    全量数据导出
                  </CardTitle>
                  <p className="text-xs text-slate-500">将所有业务数据（导航、事项、任务、类型配置等）导出为 JSON 文件，用于备份或迁移。</p>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    disabled={exporting}
                    onClick={async () => {
                      setExporting(true);
                      setDataMessage(null);
                      try {
                        const res = await api.exportData();
                        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        const timestamp = new Date().toISOString().slice(0, 10);
                        a.download = `legal-workbench-backup-${timestamp}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                        setDataMessage({ type: 'success', text: '数据导出成功！文件已下载。' });
                      } catch (err) {
                        setDataMessage({ type: 'error', text: `导出失败：${err instanceof Error ? err.message : '未知错误'}` });
                      }
                      setExporting(false);
                    }}
                  >
                    {exporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                    导出 JSON 备份文件
                  </Button>
                </CardContent>
              </Card>

              {/* Import */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="h-4 w-4 text-amber-600" />
                    从 JSON 恢复数据
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    上传之前导出的 JSON 备份文件来恢复数据。
                    <span className="text-red-500 font-medium">注意：导入会覆盖当前所有业务数据！</span>
                  </p>
                </CardHeader>
                <CardContent>
                  {!confirmImport ? (
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-md cursor-pointer hover:bg-slate-50 transition-colors">
                        <Upload className="h-4 w-4 text-slate-500" />
                        <span className="text-sm text-slate-600">选择 JSON 文件</span>
                        <input
                          type="file"
                          accept=".json"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setPendingImportFile(file);
                              setConfirmImport(true);
                            }
                          }}
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3 p-4 border border-amber-200 bg-amber-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-amber-800">确认导入</p>
                          <p className="text-xs text-amber-700 mt-1">
                            文件：<span className="font-mono">{pendingImportFile?.name}</span>
                            {pendingImportFile && ` (${(pendingImportFile.size / 1024).toFixed(1)} KB)`}
                          </p>
                          <p className="text-xs text-red-600 mt-1 font-medium">此操作会清空现有数据后导入，不可撤销！</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={importing}
                          onClick={async () => {
                            if (!pendingImportFile) return;
                            setImporting(true);
                            setDataMessage(null);
                            try {
                              const text = await pendingImportFile.text();
                              const jsonData = JSON.parse(text);
                              await api.importData(jsonData);
                              setDataMessage({ type: 'success', text: '数据导入成功！' });
                              setConfirmImport(false);
                              setPendingImportFile(null);
                            } catch (err) {
                              setDataMessage({ type: 'error', text: `导入失败：${err instanceof Error ? err.message : '文件格式错误'}` });
                            }
                            setImporting(false);
                          }}
                        >
                          {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          确认导入
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => { setConfirmImport(false); setPendingImportFile(null); }}>
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Clear / Initialize */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-red-600" />
                    清空数据 / 初始化
                  </CardTitle>
                  <p className="text-xs text-slate-500">
                    清除所有业务数据（导航、事项、任务、文档、日志等），恢复到初始状态。用户账号不会被删除。
                  </p>
                </CardHeader>
                <CardContent>
                  {!confirmClear ? (
                    <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => setConfirmClear(true)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      清空所有业务数据
                    </Button>
                  ) : (
                    <div className="space-y-3 p-4 border border-red-200 bg-red-50 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-red-800">危险操作确认</p>
                          <p className="text-xs text-red-700 mt-1">
                            此操作将永久删除所有业务数据，包括：导航、法务事项、任务、文档关联、操作日志、回收站记录。
                          </p>
                          <p className="text-xs text-red-600 mt-1 font-bold">此操作不可撤销！建议先导出备份。</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={clearing}
                          onClick={async () => {
                            setClearing(true);
                            setDataMessage(null);
                            try {
                              await api.clearData();
                              setDataMessage({ type: 'success', text: '所有业务数据已清空（用户账号已保留）。' });
                              setConfirmClear(false);
                            } catch (err) {
                              setDataMessage({ type: 'error', text: `清空失败：${err instanceof Error ? err.message : '未知错误'}` });
                            }
                            setClearing(false);
                          }}
                        >
                          {clearing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                          确认清空
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setConfirmClear(false)}>
                          取消
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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

      {/* Create User Dialog */}
      <Dialog open={createUserDialogOpen} onOpenChange={setCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>创建账号</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">邮箱</label>
              <Input
                type="email"
                placeholder="用户登录邮箱"
                value={createUserForm.email}
                onChange={e => setCreateUserForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">姓名</label>
              <Input
                placeholder="用户姓名"
                value={createUserForm.fullName}
                onChange={e => setCreateUserForm(f => ({ ...f, fullName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">初始密码</label>
              <Input
                type="password"
                placeholder="至少6位，创建后请告知用户"
                value={createUserForm.password}
                onChange={e => setCreateUserForm(f => ({ ...f, password: e.target.value }))}
                minLength={6}
              />
            </div>
            {createUserError && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">{createUserError}</div>
            )}
            <Button
              className="w-full"
              disabled={creatingUser || !createUserForm.email || !createUserForm.fullName || !createUserForm.password}
              onClick={async () => {
                setCreatingUser(true);
                setCreateUserError('');
                try {
                  await api.createUser(createUserForm.email, createUserForm.fullName, createUserForm.password);
                  setCreateUserSuccess(`账号 ${createUserForm.email} 创建成功！请将密码告知用户。`);
                  setCreateUserDialogOpen(false);
                  loadData();
                } catch (err) {
                  setCreateUserError(err instanceof Error ? err.message : '创建失败');
                }
                setCreatingUser(false);
              }}
            >
              {creatingUser && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              创建
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
