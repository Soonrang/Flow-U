// src/app/admin/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ClipboardList, Users, UserCircle, LogOut } from 'lucide-react';
import { Toaster } from 'sonner';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // 관리자 사이드바 메뉴 구성
  const adminMenus = [
    { name: '보호소 리스트', href: '/admin/shelters', icon: Building2 },
    { name: '보호소 신청 관리', href: '/admin/requests', icon: ClipboardList },
    { name: '관리자 목록', href: '/admin/users', icon: Users },
    { name: '내 프로필', href: '/admin/profile', icon: UserCircle },
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Toaster richColors position="top-right" />
      {/* ⬅️ 좌측 사이드바 */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <Link href="/admin/shelters" className="text-xl font-bold text-blue-600">
            FlowU Admin
          </Link>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {adminMenus.map((menu) => {
            const Icon = menu.icon;
            // 현재 보고 있는 페이지인지 확인하여 스타일(파란색) 활성화
            const isActive = pathname.startsWith(menu.href);

            return (
              <Link
                key={menu.name}
                href={menu.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {menu.name}
              </Link>
            );
          })}
        </nav>

        {/* 하단 로그아웃 버튼 (디자인용) */}
        <div className="p-4 border-t border-gray-200">
          <button className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-gray-600 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors">
            <LogOut className="w-5 h-5 text-gray-400" />
            로그아웃
          </button>
        </div>
      </aside>

      {/* ➡️ 우측 메인 콘텐츠 영역 (여기에 각 페이지 내용이 렌더링됩니다) */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}