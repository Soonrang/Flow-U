// src/components/MapCustomMarker.tsx
'use client';

import React from 'react';

import type { AnimalTypeCode } from '@/lib/animalType';

interface MapCustomMarkerProps {
  /** 1=강아지, 2=고양이, 3=혼합 */
  type: AnimalTypeCode;
}

const MapCustomMarker: React.FC<MapCustomMarkerProps> = ({ type }) => {
  const markerConfigs: Record<
    AnimalTypeCode,
    { borderColor: string; bgColor: string; icon: string }
  > = {
    1: {
      borderColor: 'border-sky-400',
      bgColor: 'bg-sky-100',
      icon: '🐶',
    },
    2: {
      borderColor: 'border-pink-400',
      bgColor: 'bg-pink-100',
      icon: '🐱',
    },
    3: {
      borderColor: 'border-emerald-400',
      bgColor: 'bg-emerald-100',
      icon: '🍀',
    },
  };

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