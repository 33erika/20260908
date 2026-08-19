'use client';

import { useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { getSupabaseBrowserClientWithRetry } from '@/lib/supabase-browser';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const supabase = await getSupabaseBrowserClientWithRetry();
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) {
    headers['x-session'] = session.access_token;
  }
  return headers;
}

function createApi() {
  const fetchApi = async (url: string, options?: RequestInit) => {
    const headers = await getAuthHeaders();
    const res = await fetch(url, { ...options, headers: { ...headers, ...options?.headers } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  };

  return {
    // Navigation
    getNavCategories: () => fetchApi('/api/nav'),
    createNavItem: (body: Record<string, unknown>) => fetchApi('/api/nav', { method: 'POST', body: JSON.stringify(body) }),
    updateNavItem: (body: Record<string, unknown>) => fetchApi('/api/nav', { method: 'PUT', body: JSON.stringify(body) }),
    deleteNavItem: (type: string, id: string) => fetchApi(`/api/nav?type=${type}&id=${id}`, { method: 'DELETE' }),

    // Tasks
    getTasks: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi(`/api/tasks${qs}`);
    },
    createTask: (body: Record<string, unknown>) => fetchApi('/api/tasks', { method: 'POST', body: JSON.stringify(body) }),
    updateTask: (body: Record<string, unknown>) => fetchApi('/api/tasks', { method: 'PUT', body: JSON.stringify(body) }),
    deleteTask: (id: string) => fetchApi(`/api/tasks?id=${id}`, { method: 'DELETE' }),

    // Cases
    getCases: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi(`/api/cases${qs}`);
    },
    createCase: (body: Record<string, unknown>) => fetchApi('/api/cases', { method: 'POST', body: JSON.stringify(body) }),
    updateCase: (body: Record<string, unknown>) => fetchApi('/api/cases', { method: 'PUT', body: JSON.stringify(body) }),
    deleteCase: (id: string) => fetchApi(`/api/cases?id=${id}`, { method: 'DELETE' }),

    // Case Types
    getCaseTypes: () => fetchApi('/api/case-types'),
    createCaseTypeItem: (body: Record<string, unknown>) => fetchApi('/api/case-types', { method: 'POST', body: JSON.stringify(body) }),
    updateCaseTypeItem: (body: Record<string, unknown>) => fetchApi('/api/case-types', { method: 'PUT', body: JSON.stringify(body) }),
    deleteCaseTypeItem: (type: string, id: string) => fetchApi(`/api/case-types?type=${type}&id=${id}`, { method: 'DELETE' }),

    // Search
    search: (q: string, type?: string) => {
      const params = new URLSearchParams({ q });
      if (type) params.set('type', type);
      return fetchApi(`/api/search?${params.toString()}`);
    },

    // Dashboard
    getDashboard: () => fetchApi('/api/dashboard'),

    // Consultations (法律咨询)
    getConsultations: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi(`/api/consultations${qs}`);
    },

    // Documents
    getDocuments: (caseId: string) => fetchApi(`/api/documents?caseId=${caseId}`),
    createDocument: (body: Record<string, unknown>) => fetchApi('/api/documents', { method: 'POST', body: JSON.stringify(body) }),
    deleteDocument: (id: string) => fetchApi(`/api/documents?id=${id}`, { method: 'DELETE' }),

    // Recycle
    getRecycleBin: () => fetchApi('/api/recycle'),
    restoreItem: (id: string) => fetchApi('/api/recycle', { method: 'POST', body: JSON.stringify({ action: 'restore', id }) }),
    permanentDelete: (id: string) => fetchApi('/api/recycle', { method: 'POST', body: JSON.stringify({ action: 'permanent_delete', id }) }),

    // Operation Logs
    getOperationLogs: (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi(`/api/operation-logs${qs}`);
    },

    // Profiles
    getProfiles: () => fetchApi('/api/profiles'),
    updateProfile: (body: Record<string, unknown>) => fetchApi('/api/profiles', { method: 'PUT', body: JSON.stringify(body) }),
  };
}

export function useApi() {
  const { user } = useAuth();
  const api = useMemo(() => createApi(), [user]);

  return { api, isAuthenticated: !!user };
}
