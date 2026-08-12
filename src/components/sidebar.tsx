'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import {
  Scale, Home, Link2, CheckSquare, Briefcase,
  BarChart3, Search, Trash2, Settings, LogOut, User
} from 'lucide-react';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/links', label: '法务导航', icon: Link2 },
  { href: '/todos', label: '待办与提醒', icon: CheckSquare },
  { href: '/cases', label: '法务事项', icon: Briefcase },
  { href: '/dashboard', label: '数据汇总', icon: BarChart3 },
  { href: '/search', label: '全局搜索', icon: Search },
  { href: '/recycle', label: '回收站', icon: Trash2 },
  { href: '/settings', label: '系统设置', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-100">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-sm">
          <Scale className="h-4 w-4 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-slate-900 leading-tight">法务工作台</h1>
          <p className="text-[10px] text-slate-400 leading-tight">WorkBuddy</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )}
            >
              <item.icon className={cn('h-4 w-4', isActive ? 'text-indigo-600' : 'text-slate-400')} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
            <User className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {profile?.full_name || '用户'}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {profile?.role === 'admin' ? '管理员' : '法务成员'}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            title="退出登录"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
