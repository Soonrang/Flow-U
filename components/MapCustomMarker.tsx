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
  { imageSrc: string; imageAlt: string; outlineColor: string }
> = {
  1: {
    imageSrc: '/markers/marker-dog.png',
    imageAlt: 'Dog shelter',
    outlineColor: '#38bdf8',
  },
  2: {
    imageSrc: '/markers/marker-cat.png',
    imageAlt: 'Cat shelter',
    outlineColor: '#f472b6',
  },
  3: {
    imageSrc: '/mixMarker.png',
    imageAlt: 'Mixed shelter',
    outlineColor: '#34d399',
  },
};

const MapCustomMarker: React.FC<MapCustomMarkerProps> = ({ type, selected = false }) => {
  const { imageSrc, imageAlt, outlineColor } = markerConfigs[type];
  const outlineFilter = [
    `drop-shadow(1px 0 0 ${outlineColor})`,
    `drop-shadow(-1px 0 0 ${outlineColor})`,
    `drop-shadow(0 1px 0 ${outlineColor})`,
    `drop-shadow(0 -1px 0 ${outlineColor})`,
    `drop-shadow(0 4px 5px rgb(15 23 42 / ${selected ? '0.25' : '0.18'}))`,
  ].join(' ');

  return (
    <div
      className={`
        flex items-center justify-center transition-transform
        hover:-translate-y-1 hover:scale-110
        ${selected ? 'scale-110' : ''}
      `}
    >
      <Image
        src={imageSrc}
        alt={imageAlt}
        width={64}
        height={64}
        className={`${selected ? 'h-16 w-16' : 'h-14 w-14'} object-contain transition-all`}
        style={{ filter: outlineFilter }}
      />
    </div>
  );
};

export default MapCustomMarker;
