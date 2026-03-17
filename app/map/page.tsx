// src/app/map/page.tsx
'use client';

import { useState } from 'react';
import { Map, MapMarker, useKakaoLoader } from 'react-kakao-maps-sdk';
import { Search, Plus, List } from 'lucide-react'; // 아이콘 라이브러리

// 임시 보호소 데이터 (나중에 Supabase DB에서 가져올 데이터입니다)
const dummyShelters = [
  { id: 1, name: '플로우 고양이 쉼터', lat: 37.3614, lng: 126.9351, type: 'cat' },
  { id: 2, name: '희망 강아지 보호소', lat: 37.3580, lng: 126.9330, type: 'dog' },
  { id: 3, name: '다함께 동물센터', lat: 37.3650, lng: 126.9400, type: 'mixed' },
];

export default function MapPage() {
  const [searchKeyword, setSearchKeyword] = useState('');

  // Next.js 환경에서 카카오맵 스크립트를 안전하게 불러오는 훅입니다.
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_APP_KEY as string,
  });

  if (loading) return <div className="flex h-screen items-center justify-center">지도를 불러오는 중...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">지도를 불러오지 못했습니다. 앱 키를 확인해 주세요.</div>;

  // 1. 타입별 마커 이미지 설정 (크기와 오프셋은 이미지 파일에 맞춰 조절 가능합니다)
  const markerConfigs = {
    cat: {
      src: '/catMarker.png',
      size: { width: 50, height: 55 }, // 마커 이미지의 크기
      options: { offset: { x: 22, y: 45 } }, // 마커의 중심점 (하단 중앙)
    },
    dog: {
      src: '/dogMarker.png',
      size: { width: 50, height: 55 },
      options: { offset: { x: 22, y: 45 } },
    },
    mixed: {
      src: '/mixMarker.png',
      size: { width: 50, height: 55 },
      options: { offset: { x: 25, y: 50 } },
    },
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      
      {/* 1. 카카오 지도 영역 */}
      <Map
        center={{ lat: 37.3614, lng: 126.9351 }} // 초기 중심 좌표
        style={{ width: '100%', height: '100%' }}
        level={4} // 지도의 확대 레벨
      >
        {/* 임시 데이터를 돌면서 마커를 찍어줍니다 */}
        {dummyShelters.map((shelter) => (
          <MapMarker
            key={shelter.id}
            position={{ lat: shelter.lat, lng: shelter.lng }}
            title={shelter.name}
            // 💡 추후 이 부분에 이전에 디자인했던 마커 이미지를 적용할 수 있습니다.
            image={markerConfigs[shelter.type as keyof typeof markerConfigs]}
          />
        ))}
      </Map>

      {/* 2. 상단 검색창 오버레이 */}
      <div className="absolute top-6 left-1/2 z-10 flex w-11/12 max-w-md -translate-x-1/2 transform items-center rounded-full bg-white px-5 py-3.5 shadow-lg">
        <Search className="h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="보호소 이름이나 지역을 검색해 보세요"
          className="ml-3 w-full bg-transparent text-base text-gray-800 outline-none placeholder:text-gray-400 font-medium"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </div>

      {/* 3. 우측 하단 플로팅 버튼 (보호소 등록 / 목록 표시) */}
      <div className="absolute bottom-8 right-6 z-10 flex flex-col gap-3">
        {/* 목록 표시 버튼 */}
        <button 
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-700 shadow-xl transition-transform hover:scale-105"
          title="보호소 목록 보기"
        >
          <List className="h-6 w-6" />
        </button>
        
        {/* 보호소 등록 버튼 */}
        <button 
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-xl transition-transform hover:scale-105"
          title="새로운 보호소 등록"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>

    </div>
  );
}