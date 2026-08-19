'use client';

import { useState, useCallback } from 'react';
import { useApi } from '@/hooks/use-api';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sparkles, Loader2, FileText, Scale, Calendar, User, Building2,
  AlertCircle, CheckCircle2, ArrowRight, Copy, Trash2, Import, Search
} from 'lucide-react';

interface ParsedData {
  caseNumber: string;
  court: string;
  parties: string[];
  documentType: string;
  hearingDate: string | null;
  deadline: string | null;
  deadlineType: string | null;
  summary: string;
  rawText: string;
}

interface MatchedCase {
  id: string;
  name: string;
  status: string;
  opposing_party: string | null;
}

const DOCUMENT_TYPE_OPTIONS = [
  '传票', '起诉状副本', '举证通知书', '答辩通知书',
  '判决书', '裁定书', '调解书', '通知书', '其他'
];

const DEADLINE_TYPE_OPTIONS = [
  '开庭时间', '举证期限', '答辩期限', '上诉期限', '保全期限', '其他'
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' },
];

export default function SmartInputPage() {
  const { profile } = useAuth();
  const { api } = useApi();
  const [inputText, setInputText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchedCases, setMatchedCases] = useState<MatchedCase[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for editing parsed data before import
  const [editForm, setEditForm] = useState({
    caseNumber: '',
    court: '',
    parties: '',
    documentType: '',
    hearingDate: '',
    deadline: '',
    deadlineType: '',
    summary: '',
    caseName: '',
    caseTypeId: '',
    priority: 'medium',
    description: '',
  });
  const [caseTypes, setCaseTypes] = useState<{ id: string; name: string }[]>([]);
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Load case types on mount
  const loadCaseTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/case-types');
      if (res.ok) {
        const data = await res.json();
        setCaseTypes(data.data || []);
      }
    } catch {
      // silent
    }
  }, []);

  // Parse text using LLM
  const handleParse = async () => {
    if (!inputText.trim()) {
      setError('请输入法院送达短信或文书内容');
      return;
    }
    setError(null);
    setIsParsing(true);
    setParsedData(null);
    setMatchedCases([]);

    try {
      const res = await api.smartInputParse(inputText);
      if (res.data) {
        const data = res.data as ParsedData;
        setParsedData(data);
        setEditForm({
          caseNumber: data.caseNumber || '',
          court: data.court || '',
          parties: (data.parties || []).join('、'),
          documentType: data.documentType || '',
          hearingDate: data.hearingDate || '',
          deadline: data.deadline || '',
          deadlineType: data.deadlineType || '',
          summary: data.summary || '',
          caseName: data.caseNumber || data.summary || '',
          caseTypeId: '',
          priority: 'medium',
          description: data.summary || '',
        });
        loadCaseTypes();
      } else {
        setError(res.error || '解析失败');
      }
    } catch (err) {
      setError('解析服务异常，请稍后重试');
    } finally {
      setIsParsing(false);
    }
  };

  // Match against existing cases
  const handleMatch = async () => {
    if (!parsedData) return;
    setIsMatching(true);
    setMatchedCases([]);

    try {
      const res = await api.smartInputMatch(parsedData.caseNumber, parsedData.parties.join('、'));
      if (res.data) {
        setMatchedCases(res.data as MatchedCase[]);
      }
    } catch {
      // silent
    } finally {
      setIsMatching(false);
    }
  };

  // Import as new case
  const handleImport = async () => {
    setIsImporting(true);
    setError(null);

    try {
      const parties = editForm.parties.split(/[、,，]/).map(p => p.trim()).filter(Boolean);
      const body: Record<string, unknown> = {
        caseName: editForm.caseName || editForm.caseNumber || '未命名事项',
        caseTypeId: editForm.caseTypeId,
        priority: editForm.priority,
        description: editForm.description || editForm.summary,
        opposing_party: parties.join('、'),
        caseNumber: editForm.caseNumber,
        court: editForm.court,
        documentType: editForm.documentType,
        hearingDate: editForm.hearingDate || null,
        deadline: editForm.deadline || null,
        deadlineType: editForm.deadlineType || null,
        summary: editForm.summary,
        ownerId: profile?.id,
      };

      const res = await api.smartInputImport(body);
      if (res.data) {
        setImportSuccess(true);
        setShowImportDialog(false);
        // Reset after success
        setTimeout(() => {
          setImportSuccess(false);
          setInputText('');
          setParsedData(null);
          setEditForm({
            caseNumber: '', court: '', parties: '', documentType: '',
            hearingDate: '', deadline: '', deadlineType: '', summary: '',
            caseName: '', caseTypeId: '', priority: 'medium', description: '',
          });
        }, 2000);
      } else {
        setError(res.error || '导入失败');
      }
    } catch {
      setError('导入服务异常，请稍后重试');
    } finally {
      setIsImporting(false);
    }
  };

  const updateEditForm = (field: string, value: string) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">智能录入</h1>
            <p className="text-sm text-slate-500">粘贴法院短信或文书内容，AI 自动提取结构化信息</p>
          </div>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              输入内容
            </CardTitle>
            <CardDescription>
              粘贴法院送达短信、传票、通知书等文本内容，系统将自动解析关键信息
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="例如：&#10;【北京朝阳法院】您好，您涉及的（2026）京0105民初1234号案件，原告张三诉被告李四合同纠纷一案，定于2026年3月15日上午9:30在第三法庭开庭审理，请准时到庭。举证期限至2026年3月10日。"
              className="min-h-[160px] font-mono text-sm"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <Button
                onClick={handleParse}
                disabled={isParsing || !inputText.trim()}
                className="gap-2"
              >
                {isParsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    解析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    智能解析
                  </>
                )}
              </Button>
              {parsedData && (
                <Button
                  variant="outline"
                  onClick={() => { setInputText(''); setParsedData(null); setMatchedCases([]); }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  清空
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {importSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              事项已成功创建！
            </AlertDescription>
          </Alert>
        )}

        {/* Parsed Results */}
        {parsedData && (
          <div className="space-y-6">
            {/* Extracted Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  解析结果
                </CardTitle>
                <CardDescription>
                  AI 从文本中提取的结构化信息，您可以编辑修正
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Quick Info Badges */}
                <div className="flex flex-wrap gap-2">
                  {parsedData.documentType && (
                    <Badge variant="secondary" className="gap-1">
                      <FileText className="h-3 w-3" />
                      {parsedData.documentType}
                    </Badge>
                  )}
                  {parsedData.caseNumber && (
                    <Badge variant="outline" className="gap-1">
                      <Scale className="h-3 w-3" />
                      {parsedData.caseNumber}
                    </Badge>
                  )}
                  {parsedData.court && (
                    <Badge variant="outline" className="gap-1">
                      <Building2 className="h-3 w-3" />
                      {parsedData.court}
                    </Badge>
                  )}
                  {parsedData.hearingDate && (
                    <Badge className="bg-blue-100 text-blue-700 gap-1">
                      <Calendar className="h-3 w-3" />
                      开庭：{parsedData.hearingDate}
                    </Badge>
                  )}
                  {parsedData.deadline && (
                    <Badge className="bg-amber-100 text-amber-700 gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {parsedData.deadlineType || '截止'}：{parsedData.deadline}
                    </Badge>
                  )}
                </div>

                {/* Parties */}
                {parsedData.parties.length > 0 && (
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500">当事人：</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {parsedData.parties.map((p, i) => (
                          <Badge key={i} variant="secondary">{p}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Summary */}
                {parsedData.summary && (
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs text-slate-500">摘要：</span>
                      <p className="text-sm text-slate-700 mt-0.5">{parsedData.summary}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-500" />
                  编辑确认
                </CardTitle>
                <CardDescription>
                  请确认或修正以下信息，确认无误后导入为法务事项
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="caseName">事项名称</Label>
                    <Input
                      id="caseName"
                      value={editForm.caseName}
                      onChange={(e) => updateEditForm('caseName', e.target.value)}
                      placeholder="如：张三诉李四合同纠纷案"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseNumber">案号</Label>
                    <Input
                      id="caseNumber"
                      value={editForm.caseNumber}
                      onChange={(e) => updateEditForm('caseNumber', e.target.value)}
                      placeholder="（2026）京0105民初1234号"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="court">审理法院</Label>
                    <Input
                      id="court"
                      value={editForm.court}
                      onChange={(e) => updateEditForm('court', e.target.value)}
                      placeholder="北京市朝阳区人民法院"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parties">当事人</Label>
                    <Input
                      id="parties"
                      value={editForm.parties}
                      onChange={(e) => updateEditForm('parties', e.target.value)}
                      placeholder="用顿号分隔，如：张三、李四"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documentType">文书类型</Label>
                    <Select
                      value={editForm.documentType}
                      onValueChange={(v) => updateEditForm('documentType', v)}
                    >
                      <SelectTrigger id="documentType">
                        <SelectValue placeholder="选择文书类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="caseTypeId">事项类型</Label>
                    <Select
                      value={editForm.caseTypeId}
                      onValueChange={(v) => updateEditForm('caseTypeId', v)}
                    >
                      <SelectTrigger id="caseTypeId">
                        <SelectValue placeholder="选择事项类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {caseTypes.map(ct => (
                          <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hearingDate">开庭日期</Label>
                    <Input
                      id="hearingDate"
                      type="date"
                      value={editForm.hearingDate}
                      onChange={(e) => updateEditForm('hearingDate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">截止日期</Label>
                    <Input
                      id="deadline"
                      type="date"
                      value={editForm.deadline}
                      onChange={(e) => updateEditForm('deadline', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadlineType">期限类型</Label>
                    <Select
                      value={editForm.deadlineType}
                      onValueChange={(v) => updateEditForm('deadlineType', v)}
                    >
                      <SelectTrigger id="deadlineType">
                        <SelectValue placeholder="选择期限类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEADLINE_TYPE_OPTIONS.map(opt => (
                          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">优先级</Label>
                    <Select
                      value={editForm.priority}
                      onValueChange={(v) => updateEditForm('priority', v)}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="选择优先级" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRIORITY_OPTIONS.map(opt => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">备注说明</Label>
                  <Textarea
                    id="description"
                    value={editForm.description}
                    onChange={(e) => updateEditForm('description', e.target.value)}
                    placeholder="补充说明..."
                    className="min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                onClick={handleMatch}
                variant="outline"
                disabled={isMatching}
                className="gap-2"
              >
                {isMatching ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    匹配中...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    匹配已有事项
                  </>
                )}
              </Button>
              <Button
                onClick={() => setShowImportDialog(true)}
                disabled={!editForm.caseName && !editForm.caseNumber}
                className="gap-2"
              >
                <Import className="h-4 w-4" />
                导入为法务事项
              </Button>
            </div>

            {/* Matched Cases */}
            {matchedCases.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4 text-slate-500" />
                    匹配到的已有事项
                  </CardTitle>
                  <CardDescription>
                    发现 {matchedCases.length} 个可能相关的事项
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {matchedCases.map(c => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <BriefcaseIcon className="h-4 w-4 text-slate-400" />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{c.name}</p>
                            {c.opposing_party && (
                              <p className="text-xs text-slate-500">对方：{c.opposing_party}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline">{c.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Empty State */}
        {!parsedData && !isParsing && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-indigo-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">智能录入助手</h3>
              <p className="text-sm text-slate-500 max-w-md mb-6">
                粘贴法院送达短信、传票、通知书等文本内容，AI 将自动提取案号、当事人、开庭时间、截止日期等关键信息，一键创建法务事项。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-lg">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <FileText className="h-4 w-4 text-slate-400" />
                  自动解析文书
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Search className="h-4 w-4 text-slate-400" />
                  智能匹配事项
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Import className="h-4 w-4 text-slate-400" />
                  一键导入系统
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Import Confirmation Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认导入</DialogTitle>
            <DialogDescription>
              将以下信息创建为新的法务事项：
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">事项名称</span>
              <span className="font-medium">{editForm.caseName || editForm.caseNumber || '未命名'}</span>
            </div>
            {editForm.caseNumber && (
              <div className="flex justify-between">
                <span className="text-slate-500">案号</span>
                <span>{editForm.caseNumber}</span>
              </div>
            )}
            {editForm.court && (
              <div className="flex justify-between">
                <span className="text-slate-500">法院</span>
                <span>{editForm.court}</span>
              </div>
            )}
            {editForm.parties && (
              <div className="flex justify-between">
                <span className="text-slate-500">当事人</span>
                <span>{editForm.parties}</span>
              </div>
            )}
            {editForm.hearingDate && (
              <div className="flex justify-between">
                <span className="text-slate-500">开庭日期</span>
                <span>{editForm.hearingDate}</span>
              </div>
            )}
            {editForm.deadline && (
              <div className="flex justify-between">
                <span className="text-slate-500">截止日期</span>
                <span className="text-amber-600 font-medium">{editForm.deadline} ({editForm.deadlineType || '其他'})</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)}>
              取消
            </Button>
            <Button onClick={handleImport} disabled={isImporting} className="gap-2">
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  导入中...
                </>
              ) : (
                <>
                  <Import className="h-4 w-4" />
                  确认导入
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="7" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </svg>
  );
}
