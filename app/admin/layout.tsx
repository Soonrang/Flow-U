'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2, Loader2, LogOut, ShieldAlert, UserCircle, Users } from 'lucide-react';
import { Toaster } from 'sonner';

import { supabase } from '@/lib/supabase';

type AdminState = 'checking' | 'allowed' | 'signed-out' | 'denied';

const ADMIN_ROLE = 'ADMIN';

const adminMenus = [
  { name: '보호소 관리', href: '/admin/shelters', icon: Building2 },
  { name: '관리자 목록', href: '/admin/users', icon: Users },
  { name: '내 프로필', href: '/admin/profile', icon: UserCircle },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [adminState, setAdminState] = useState<AdminState>('checking');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const checkAdminRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setAdminState('signed-out');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error) {
        setMessage('사용자 권한을 확인할 수 없습니다. users.role 조회 정책을 확인해 주세요.');
        setAdminState('denied');
        return;
      }

      setAdminState(data?.role === ADMIN_ROLE ? 'allowed' : 'denied');
    };

    void checkAdminRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/map');
  };

  if (adminState === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-medium text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-600" />
        관리자 권한 확인 중
      </div>
    );
  }

  if (adminState !== 'allowed') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <Toaster richColors position="top-right" />
        <div className="w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <ShieldAlert className="h-6 w-6 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {adminState === 'signed-out' ? '로그인이 필요합니다' : '관리자 권한이 없습니다'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {adminState === 'signed-out'
              ? '관리자 페이지는 로그인 후 이용할 수 있습니다.'
              : message || 'users.role 값이 ADMIN인 계정만 접근할 수 있습니다.'}
          </p>
          <button
            type="button"
            onClick={() => router.push('/map')}
            className="mt-6 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            지도로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 md:flex-row">
      <Toaster richColors position="top-right" />

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white md:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin/shelters" className="text-lg font-bold text-blue-600">
            FlowU Admin
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-red-50 hover:text-red-600"
            aria-label="로그아웃"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {adminMenus.map((menu) => {
            const Icon = menu.icon;
            const isActive = pathname.startsWith(menu.href);

            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {menu.name}
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white md:flex">
        <div className="flex h-14 items-center border-b border-gray-200 px-6">
          <Link href="/admin/shelters" className="text-xl font-bold text-blue-600">
            FlowU Admin
          </Link>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          {adminMenus.map((menu) => {
            const Icon = menu.icon;
            const isActive = pathname.startsWith(menu.href);

            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors ${
                  isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {menu.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-4">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-5 w-5 text-gray-400" />
            로그아웃
          </button>
        </div>
      </aside>

      <main className="w-full flex-1 overflow-y-auto">
        <div className="w-full">{children}</div>
      </main>
    </div>
  );
}
