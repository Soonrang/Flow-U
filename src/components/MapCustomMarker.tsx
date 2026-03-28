// src/components/MapCustomMarker.tsx
'use client';

import React from 'react';

// 마커 타입을 정의합니다.
type MarkerType = 'cat' | 'dog' | 'mixed';

interface MapCustomMarkerProps {
  type: MarkerType;
}

const MapCustomMarker: React.FC<MapCustomMarkerProps> = ({ type }) => {
  // 💡 타입에 따른 테두리색, 배경색, 아이콘을 모두 설정합니다.
  const markerConfigs = {
    cat: {
      borderColor: 'border-pink-400', // 진한 핑크 테두리
      bgColor: 'bg-pink-100', // 연한 핑크 배경
      icon: '🐱', 
    },
    dog: {
      borderColor: 'border-sky-400', // 진한 블루 테두리
      bgColor: 'bg-sky-100', // 연한 블루 배경
      icon: '🐶', 
    },
    mixed: {
      borderColor: 'border-emerald-400', // 진한 그린 테두리
      bgColor: 'bg-emerald-100', // 연한 그린 배경
      icon: '🍀', 
    },
  };

  // 💡 1. 여기서 bgColor도 함께 꺼내옵니다.
  const { borderColor, bgColor, icon } = markerConfigs[type];

  return (
    <div className={`
      flex items-center justify-center 
      rounded-full border-2 
      ${bgColor} /* 💡 2. 기존 bg-white를 지우고 꺼내온 배경색을 넣습니다! */
      shadow-lg transition-all 
      w-12 h-12 
      hover:scale-110 hover:shadow-xl hover:-translate-y-1
      ${borderColor}
    `}>
      <span className="text-2xl">{icon}</span>
    </div>
  );
};

export default MapCustomMarker;