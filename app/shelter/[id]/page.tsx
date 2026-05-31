// src/app/shelter/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Phone, Clock } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { normalizeAnimalType, type AnimalTypeCode } from '@/lib/animalType';
import { ANIMAL_BADGE_CLASS, ANIMAL_LABEL } from '@/lib/shelterUi';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type ShelterDetail = {
  id: number;
  name: string;
  address: string | null;
  phone_number: string | null;
  operating_hours: string | null;
  description: string | null;
  animal_type: number | null;
  latitude: number | null;
  longitude: number | null;
};

// 공통 UI 상수는 `lib/shelterUi`로 이동

export default function ShelterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string | undefined;

  const shelterId = useMemo(() => {
    const n = Number(id);
    return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null;
  }, [id]);

  const [shelter, setShelter] = useState<ShelterDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchShelterDetail = async () => {
      setIsLoading(true);
      setErrorMessage('');
      setShelter(null);

      if (!shelterId) {
        setIsLoading(false);
        setErrorMessage('잘못된 보호소 ID입니다.');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('shelters')
          .select('id, name, address, phone_number, operating_hours, description, animal_type, latitude, longitude')
          .eq('id', shelterId)
          .eq('use_yn', 'Y')
          .eq('aprv_status', 'Y')
          .or('del_yn.eq.N,del_yn.is.null')
          .single();

        if (error) throw error;
        setShelter((data as ShelterDetail) ?? null);
      } catch {
        setErrorMessage('보호소 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchShelterDetail();
  }, [shelterId]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="container flex h-14 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <span className="font-semibold truncate">{shelter?.name ?? '보호소'}</span>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            보호소 정보를 불러오는 중입니다...
          </div>
        ) : errorMessage ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-4">
            <p>{errorMessage}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.back()}>
                뒤로가기
              </Button>
              <Button onClick={() => router.push('/map')}>지도로 돌아가기</Button>
            </div>
          </div>
        ) : !shelter ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-4">
            <p>보호소를 찾을 수 없습니다</p>
            <Button onClick={() => router.push('/map')}>지도로 돌아가기</Button>
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold">{shelter.name}</h2>
              <Badge
                variant="outline"
                className={ANIMAL_BADGE_CLASS[normalizeAnimalType(shelter.animal_type, shelter.id)]}
              >
                {ANIMAL_LABEL[normalizeAnimalType(shelter.animal_type, shelter.id)]}
              </Badge>
            </div>

            {(shelter.description?.trim() ?? '') !== '' ? (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{shelter.description}</p>
            ) : null}

            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0 text-emerald-500" />
                {shelter.address?.trim() || '—'}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                {shelter.phone_number?.trim() || '—'}
              </p>
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4 shrink-0 text-emerald-500" />
                {shelter.operating_hours?.trim() || '—'}
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

