// src/components/MapCustomMarker.tsx
'use client';

import Image from 'next/image';
import React from 'react';

import type { AnimalTypeCode } from '@/lib/animalType';

interface MapCustomMarkerProps {
  /** 1=dog, 2=cat, 3=mixed */
  type: AnimalTypeCode;
  selected?: boolean;
}

const markerConfigs: Record<
  AnimalTypeCode,
  { borderColor: string; imageSrc: string; imageAlt: string }
> = {
  1: {
    borderColor: 'border-sky-400',
    imageSrc: '/default-avatars/avatar-2.png',
    imageAlt: 'Dog shelter',
  },
  2: {
    borderColor: 'border-pink-400',
    imageSrc: '/default-avatars/avatar-1.png',
    imageAlt: 'Cat shelter',
  },
  3: {
    borderColor: 'border-emerald-400',
    imageSrc: '/mixMarker.png',
    imageAlt: 'Mixed shelter',
  },
};

const MapCustomMarker: React.FC<MapCustomMarkerProps> = ({ type, selected = false }) => {
  const { borderColor, imageSrc, imageAlt } = markerConfigs[type];

  return (
    <div
      className={`
        flex items-center justify-center rounded-full bg-white transition-all
        hover:-translate-y-1 hover:scale-110 hover:shadow-xl
        ${borderColor}
        ${
          selected
            ? 'h-14 w-14 border-4 shadow-2xl ring-4 ring-white ring-offset-2 ring-offset-emerald-400'
            : 'h-12 w-12 border-2 shadow-lg'
        }
      `}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={40}
        height={40}
        className={`${selected ? 'h-12 w-12' : 'h-10 w-10'} rounded-full object-contain p-0.5 transition-all`}
      />
    </div>
  );
};

export default MapCustomMarker;
