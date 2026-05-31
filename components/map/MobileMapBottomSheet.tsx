'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import { Clock, MapPin, Phone } from 'lucide-react';

import { type AnimalTypeCode } from '@/lib/animalType';
import { ANIMAL_BADGE_CLASS, ANIMAL_LABEL } from '@/lib/shelterUi';

export type SheetState = 'closed' | 'half' | 'full';

export interface ShelterListItem {
  id: number;
  name: string;
  lat: number;
  lng: number;
  address: string;
  phone: string;
  hours: string;
  type: AnimalTypeCode;
  distanceKm: number;
}

interface MobileMapBottomSheetProps {
  shelters: ShelterListItem[];
  sheetState: SheetState;
  onSheetStateChange: (next: SheetState) => void;
  onSelectShelter: (shelterId: number) => void;
}

const HEADER_OFFSET = 64;
const CLOSED_OFFSET = 32;
const FULL_TOP_GAP = 12;
const HALF_RATIO = 0.46;

export default function MobileMapBottomSheet({
  shelters,
  sheetState,
  onSheetStateChange,
  onSelectShelter,
}: MobileMapBottomSheetProps) {
  const [viewportHeight, setViewportHeight] = useState(640);

  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(Math.max(window.innerHeight - HEADER_OFFSET, 360));
    };
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  const snapPoints = useMemo(() => {
    const full = FULL_TOP_GAP;
    const half = Math.round(viewportHeight * HALF_RATIO);
    const closed = viewportHeight + CLOSED_OFFSET;

    return { full, half, closed };
  }, [viewportHeight]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentY = snapPoints[sheetState];
    const projectedY = currentY + info.offset.y + info.velocity.y * 0.08;

    const candidates: SheetState[] = ['full', 'half', 'closed'];
    const nearest = candidates.reduce((prev, current) => {
      const prevDistance = Math.abs(projectedY - snapPoints[prev]);
      const currentDistance = Math.abs(projectedY - snapPoints[current]);
      return currentDistance < prevDistance ? current : prev;
    }, 'half' as SheetState);

    onSheetStateChange(nearest);
  };

  const toggleExpand = () => {
    if (sheetState === 'half') {
      onSheetStateChange('full');
      return;
    }
    onSheetStateChange('half');
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
      <motion.section
        drag="y"
        dragConstraints={{ top: snapPoints.full, bottom: snapPoints.closed }}
        dragElastic={0.08}
        onDragEnd={handleDragEnd}
        animate={{ y: snapPoints[sheetState] }}
        transition={{ type: 'spring', stiffness: 320, damping: 34, mass: 0.6 }}
        className="pointer-events-auto mx-auto h-[calc(100dvh-64px)] w-full max-w-md rounded-t-3xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur"
      >
        <button
          type="button"
          onClick={toggleExpand}
          className="flex w-full flex-col items-center gap-2 py-3"
          aria-label="목록 시트 높이 조절"
        >
          <span className="h-1.5 w-12 rounded-full bg-slate-300" />
          <span className="text-xs font-medium text-slate-500">
            {sheetState === 'full' ? '아래로 내려보기' : '위로 더 보기'}
          </span>
        </button>

        <div className="px-4 pb-4">
          <h2 className="text-base font-bold text-slate-900">
            주변 보호소 {shelters.length}곳
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            현재 지도 중심 기준 가까운 순서로 정렬됩니다.
          </p>
        </div>

        <div className="h-[calc(100%-96px)] overflow-y-auto px-4 pb-8">
          {shelters.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 py-10 text-center text-sm text-slate-500">
              검색 조건에 맞는 보호소가 없습니다.
            </div>
          ) : (
            <div className="space-y-3">
              {shelters.map((shelter) => (
                <button
                  key={shelter.id}
                  type="button"
                  onClick={() => onSelectShelter(shelter.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{shelter.name}</h3>
                    <span
                      className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ANIMAL_BADGE_CLASS[shelter.type]}`}
                    >
                      {ANIMAL_LABEL[shelter.type]}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-2">{shelter.address || '주소 정보 없음'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {shelter.phone || '-'}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {shelter.hours || '운영시간 정보 없음'}
                    </p>
                  </div>

                  <div className="mt-3 border-t border-slate-100 pt-2 text-right text-[11px] font-semibold text-emerald-600">
                    중심에서 약 {shelter.distanceKm.toFixed(1)}km
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.section>
    </div>
  );
}

