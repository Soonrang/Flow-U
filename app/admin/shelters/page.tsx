// src/app/admin/shelters/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, X, MapPin, Phone, User } from 'lucide-react';
import { supabase } from '@/src/utils/supabase';
import { toast } from 'sonner';

interface Shelter {
  id: number;
  name: string;
  sido: string | null;
  sigungu: string | null;
  address: string | null;
  phone_number: string | null;
  aprv_status: string;
  applicant_id: string | null;
  description: string | null;
  created_at: string;
  applied_at?: string | null;
}

const animalBadgeClass: Record<string, string> = {
  cat: 'border-pink-200 bg-pink-100 text-pink-700',
  dog: 'border-blue-200 bg-blue-100 text-blue-700',
  mixed: 'border-emerald-200 bg-emerald-100 text-emerald-700',
};

const animalTypeLabel: Record<string, string> = {
  cat: '🐱 고양이',
  dog: '🐶 강아지',
  mixed: '🐾 혼합',
};

function getAnimalType(id: number): keyof typeof animalTypeLabel {
  const types = ['cat', 'dog', 'mixed'] as const;
  return types[id % 3];
}

export default function AdminSheltersPage() {
  const [shelters, setShelters] = useState<Shelter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'shelters' | 'pending'>('shelters');

  const fetchShelters = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('shelters')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShelters((data as Shelter[]) || []);
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error('데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchShelters();
  }, [fetchShelters]);

  const handleApprove = async (id: number) => {
    try {
      const { error } = await supabase
        .from('shelters')
        .update({ aprv_status: 'Y', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setShelters((prev) => prev.map((s) => (s.id === id ? { ...s, aprv_status: 'Y' } : s)));
      toast.success('보호소 신청이 승인되었습니다.');
    } catch {
      toast.error('승인 처리 중 오류가 발생했습니다.');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const { error } = await supabase
        .from('shelters')
        .update({ aprv_status: 'R', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setShelters((prev) => prev.map((s) => (s.id === id ? { ...s, aprv_status: 'R' } : s)));
      toast.success('보호소 신청이 거절 처리되었습니다.');
    } catch {
      toast.error('거절 처리 중 오류가 발생했습니다.');
    }
  };

  const approved = shelters.filter((s) => s.aprv_status === 'Y');
  const pending = shelters.filter((s) => s.aprv_status === 'W');

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500">데이터 로딩 중...</div>
    );
  }

  return (
    <div className="w-full max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">보호소 관리</h1>
        <p className="mt-1 text-sm text-gray-500">승인된 보호소 목록과 대기 중인 신청을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-xs font-medium text-gray-500 sm:text-sm">등록된 보호소</p>
          <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">{approved.length}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <p className="text-xs font-medium text-gray-500 sm:text-sm">승인 대기</p>
          <p className="mt-2 text-2xl font-bold text-blue-600 sm:text-3xl">{pending.length}</p>
        </div>
      </div>

      <div className="w-full space-y-4">
        <div className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1 sm:inline-flex sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('shelters')}
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === 'shelters'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            보호소 리스트
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`relative rounded-lg py-2 text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            신청 대기
            {pending.length > 0 && (
              <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-semibold text-white sm:h-5 sm:w-5 sm:text-[11px]">
                {pending.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'shelters' && (
          <div className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/80 p-4 sm:bg-transparent sm:p-6">
              <h2 className="text-sm font-semibold text-gray-900 sm:text-base">등록된 보호소 목록</h2>
            </div>
            <div className="w-full overflow-x-auto">
              <table className="min-w-[700px] w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <th className="h-10 px-4 py-3 sm:h-12 sm:px-6">보호소명</th>
                    <th className="h-10 px-4 py-3 sm:h-12 sm:px-6">유형</th>
                    <th className="h-10 px-4 py-3 sm:h-12 sm:px-6">지역</th>
                    <th className="h-10 px-4 py-3 sm:h-12 sm:px-6">연락처</th>
                    <th className="h-10 px-4 py-3 sm:h-12 sm:px-6">등록일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {approved.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="h-24 px-4 text-center text-sm text-gray-500 sm:px-6">
                        등록된 보호소가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    approved.map((shelter) => {
                      const animalType = getAnimalType(shelter.id);
                      return (
                        <tr key={shelter.id} className="hover:bg-gray-50/80">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 sm:px-6">
                            {shelter.name}
                          </td>
                          <td className="px-4 py-3 sm:px-6">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${animalBadgeClass[animalType]}`}
                            >
                              {animalTypeLabel[animalType]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 sm:px-6 sm:text-sm">
                            {[shelter.sido, shelter.sigungu].filter(Boolean).join(' ') || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 sm:px-6 sm:text-sm">
                            {shelter.phone_number || '—'}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-600 sm:px-6 sm:text-sm">
                            {new Date(shelter.created_at).toLocaleDateString('ko-KR')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="w-full space-y-3 sm:space-y-4">
            {pending.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white py-12 text-center text-sm text-gray-500 shadow-sm">
                대기 중인 신청이 없습니다.
              </div>
            ) : (
              pending.map((app) => {
                const animalType = getAnimalType(app.id);
                return (
                  <div
                    key={app.id}
                    className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm"
                  >
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold text-gray-900 sm:text-base">{app.name}</h3>
                            <span
                              className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${animalBadgeClass[animalType]}`}
                            >
                              {animalTypeLabel[animalType]}
                            </span>
                            <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-700 sm:text-xs">
                              {new Date(app.applied_at || app.created_at).toLocaleDateString('ko-KR')} 신청
                            </span>
                          </div>

                          <div className="grid gap-1.5 rounded-lg bg-gray-50 p-3 text-xs text-gray-600 sm:text-sm">
                            <p className="flex items-center gap-2 break-all">
                              <User className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                              {app.applicant_id || '—'}
                            </p>
                            <p className="flex items-start gap-2">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                              {app.address || '—'}
                            </p>
                            <p className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />
                              {app.phone_number || '미기재'}
                            </p>
                          </div>

                          {app.description ? (
                            <p className="line-clamp-3 rounded-lg border border-gray-100 bg-gray-50 p-2 text-xs text-gray-600 sm:p-3 sm:text-sm">
                              {app.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-2 flex w-full shrink-0 flex-row gap-2 sm:mt-0 sm:w-auto sm:flex-col">
                          <button
                            type="button"
                            onClick={() => void handleApprove(app.id)}
                            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:h-9 sm:flex-none"
                          >
                            <Check className="h-4 w-4" aria-hidden />
                            승인
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleReject(app.id)}
                            className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 sm:h-9 sm:flex-none"
                          >
                            <X className="h-4 w-4" aria-hidden />
                            거절
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
