'use client'

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../src/utils/supabase'; // 이전 단계에서 만든 supabase 클라이언트

export default function Home() {
  const router = useRouter();

  // 카카오 로그인 버튼 클릭 시 실행될 함수
  const handleKakaoLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        // 로그인 성공 후 돌아올 주소 (임시로 현재 주소 설정)
        redirectTo: `${window.location.origin}/auth/callback`, 
      }
    });
    
    if (error) {
      console.error('카카오 로그인 에러:', error.message);
      alert('로그인 중 문제가 발생했습니다.');
    }
  };

  // 로그인 없이 이용하기 버튼 클릭 시 실행될 함수
  const handleGuestLogin = () => {
    // 지도가 있는 메인 페이지로 이동 (아직 없으므로 /map 경로로 설정)
    router.push('/map'); 
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
      
      {/* 로고 및 타이틀 영역 */}
      <div className="mb-16 flex flex-col items-center">
        {/* public 폴더에 logo.png를 넣으면 자동으로 불러옵니다 */}
        <div className="relative h-50 w-80 mb-4">
          <Image 
            src="/logo.png" 
            alt="FlowU Logo" 
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-800 tracking-tight">FlowU</h1>
        <p className="mt-3 text-gray-500 font-medium">유기동물 봉사 센터 지도</p>
      </div>

      {/* 버튼 영역 */}
      <div className="flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={handleKakaoLogin}
          className="flex w-full items-center justify-center rounded-xl bg-[#FEE500] px-4 py-3.5 text-base font-bold text-[#000000] hover:bg-[#FDD800] transition-colors shadow-sm"
        >
          {/* 카카오 심볼 아이콘 (간단히 텍스트로 처리하거나 SVG 추가 가능) */}
          <span className="mr-2"></span> 카카오 로그인
        </button>
        
        <button
          onClick={handleGuestLogin}
          className="flex w-full items-center justify-center rounded-xl bg-white border border-gray-200 px-4 py-3.5 text-base font-semibold text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          로그인 없이 이용하기
        </button>
      </div>

    </main>
  );
}