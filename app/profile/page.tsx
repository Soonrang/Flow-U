// src/app/profile/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { User, Mail, Save, ArrowLeft, Loader2, PawPrint, Check } from 'lucide-react';
import Image from 'next/image';

const AVATAR_COUNT = 10;
const AVATAR_PATHS = Array.from({ length: AVATAR_COUNT }, (_, i) => `/avatars/avatar-${i + 1}.PNG`);

export default function ProfileEditPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [avatarIndex, setAvatarIndex] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchUserProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        alert('로그인이 필요한 페이지입니다.');
        router.push('/map');
        return;
      }

      setUserId(session.user.id);

      const { data: userData } = await supabase
        .from('users')
        .select('nickname, email, avatar_index')
        .eq('id', session.user.id)
        .single();

      if (userData) {
        setNickname(userData.nickname || '');
        setEmail(userData.email || '');
        setAvatarIndex(userData.avatar_index ?? null);
      }
      setIsLoading(false);
    };

    fetchUserProfile();
  }, [router]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsSaving(true);
    setSuccessMessage('');

    try {
      const { error } = await supabase
        .from('users')
        .update({
          nickname: nickname.trim(),
          email: email.trim() || null,
          avatar_index: avatarIndex,
        })
        .eq('id', userId);

      if (error) throw error;

      setSuccessMessage('회원정보가 성공적으로 수정되었습니다.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('정보 수정 에러:', error);
      alert('정보 수정에 실패했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const selectedAvatarPath = avatarIndex !== null ? AVATAR_PATHS[avatarIndex - 1] : null;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 font-sans">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="text-lg font-bold text-gray-900">내 정보 수정</span>
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => router.push('/')}>
            <PawPrint className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-gray-900 tracking-tight hidden sm:block">FlowU</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 mt-8">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 sm:p-10">

          {/* 현재 선택 아바타 미리보기 */}
          <div className="mb-8 flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center overflow-hidden shadow-sm">
              {selectedAvatarPath ? (
                <Image
                  src={selectedAvatarPath}
                  alt="선택된 프로필 이미지"
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-9 h-9 text-gray-400" />
              )}
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">프로필 설정</h2>
              <p className="mt-1 text-sm text-gray-500">
                FlowU 서비스 이용을 위해 정확한 정보를 입력해 주세요.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-6">

            {/* 프로필 이미지 선택 */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" />
                프로필 이미지 선택
              </label>
              <div className="grid grid-cols-5 gap-3">
                {AVATAR_PATHS.map((path, i) => {
                  const index = i + 1;
                  const isSelected = avatarIndex === index;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setAvatarIndex(isSelected ? null : index)}
                      className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-all focus:outline-none
                        ${isSelected
                          ? 'border-emerald-400 ring-2 ring-emerald-100 scale-105'
                          : 'border-gray-200 hover:border-emerald-300 hover:scale-105'
                        }`}
                      aria-label={`프로필 이미지 ${index}`}
                    >
                      <Image
                        src={path}
                        alt={`아바타 ${index}`}
                        fill
                        className="object-cover"
                      />
                      {isSelected && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow">
                            <Check className="w-3 h-3 text-white" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-gray-400 pl-1">
                이미지를 클릭해 선택하고, 다시 클릭하면 해제됩니다.
              </p>
            </div>

            {/* 닉네임 입력 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" />
                닉네임 (활동명)
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="사용하실 닉네임을 입력하세요"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
                required
              />
              <p className="text-xs text-gray-400 pl-1">지도 리뷰나 게시판 작성 시 보여지는 이름입니다.</p>
            </div>

            {/* 이메일 입력 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-500" />
                이메일 (선택)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@flowu.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
              <p className="text-xs text-gray-400 pl-1">보호소 승인 결과 등 중요 알림을 받으실 수 있습니다.</p>
            </div>

            {/* 상태 메시지 */}
            {successMessage && (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium rounded-xl text-center">
                ✅ {successMessage}
              </div>
            )}

            {/* 저장 버튼 */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                {isSaving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    변경사항 저장하기
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
