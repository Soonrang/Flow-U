'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { useKakaoLoader } from 'react-kakao-maps-sdk';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type AnimalTypeCode, normalizeAnimalType } from '@/lib/animalType';
import { supabase } from '@/lib/supabase';

const PHONE_NUMBER_REGEX = /^[0-9+\-()\s]{8,20}$/;
const SHELTER_IMAGE_BUCKET = 'shelter-images';
const MAX_SHELTER_IMAGES = 5;
const ADMIN_ROLE = 'ADMIN';

export type ShelterForEdit = {
  id: number;
  name: string;
  sido: string | null;
  sigungu: string | null;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  phone_number: string | null;
  description: string | null;
  link_url?: string | null;
  applicant_id: string | null;
  animal_type?: number | null;
  operating_hours?: string | null;
  image_urls?: string[] | null;
  use_yn?: string | null;
  del_yn?: string | null;
  aprv_status: string;
  created_at: string;
  applied_at: string | null;
};

type ShelterEditFormMode = 'create' | 'edit';

interface ShelterEditFormProps {
  shelter?: ShelterForEdit;
  mode?: ShelterEditFormMode;
  onSaved: (row?: ShelterForEdit) => void;
  onCancel: () => void;
}

function parseOperatingHours(value: string | null | undefined): { start: string; end: string } {
  const raw = value?.trim() ?? '';
  if (!raw) return { start: '', end: '' };

  const match = raw.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (!match) return { start: '', end: '' };

  return { start: padTime(match[1]), end: padTime(match[2]) };
}

function padTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function buildOperatingHours(start: string, end: string): string | null {
  const trimmedStart = start.trim();
  const trimmedEnd = end.trim();
  if (!trimmedStart || !trimmedEnd) return null;
  return `${trimmedStart} - ${trimmedEnd}`;
}

function createEmptyShelter(now: string): ShelterForEdit {
  return {
    id: 0,
    name: '',
    sido: null,
    sigungu: null,
    address: '',
    latitude: null,
    longitude: null,
    phone_number: null,
    description: null,
    link_url: null,
    applicant_id: '관리자',
    animal_type: 1,
    operating_hours: null,
    image_urls: [],
    use_yn: 'Y',
    del_yn: 'N',
    aprv_status: 'Y',
    created_at: now,
    applied_at: null,
  };
}

function getSupabaseErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (parts.length > 0) return parts.join(' / ');
    try {
      return JSON.stringify(record);
    } catch {
      return '오류 내용을 읽을 수 없습니다.';
    }
  }
  if (typeof error === 'string') return error;
  return '오류 내용을 읽을 수 없습니다.';
}

function normalizeImageUrls(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string');
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === 'string');
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

async function getCurrentUserRole() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { userId: null, role: null };

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) throw error;
  return { userId: session.user.id, role: typeof data?.role === 'string' ? data.role : null };
}

export function ShelterEditForm({ shelter, mode = 'edit', onSaved, onCancel }: ShelterEditFormProps) {
  const openPostcodePopup = useDaumPostcodePopup();
  const isCreateMode = mode === 'create';
  const now = useMemo(() => new Date().toISOString(), []);
  const baseShelter = shelter ?? createEmptyShelter(now);
  const { start: operatingStart, end: operatingEnd } = parseOperatingHours(baseShelter.operating_hours);

  const [form, setForm] = useState({
    name: baseShelter.name,
    address: baseShelter.address ?? '',
    addressDetail: '',
    sido: baseShelter.sido ?? '',
    sigungu: baseShelter.sigungu ?? '',
    latitude: baseShelter.latitude != null ? String(baseShelter.latitude) : '',
    longitude: baseShelter.longitude != null ? String(baseShelter.longitude) : '',
    phoneNumber: baseShelter.phone_number ?? '',
    description: baseShelter.description ?? '',
    linkUrl: baseShelter.link_url ?? '',
    applicantId: baseShelter.applicant_id ?? '',
    animalType: normalizeAnimalType(baseShelter.animal_type, baseShelter.id),
    useYn: baseShelter.use_yn === 'N' ? 'N' : 'Y',
    operatingStart,
    operatingEnd,
  });
  const [imageUrls, setImageUrls] = useState<string[]>(() => (baseShelter.image_urls ?? []).slice(0, MAX_SHELTER_IMAGES));
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [isLatLngEditable, setIsLatLngEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_APP_KEY as string,
    libraries: ['services'],
  });

  const selectedImageCount = imageUrls.length + pendingImages.length;
  const kakaoReady = !kakaoLoading && !kakaoError;
  const pendingImagePreviews = useMemo(
    () => pendingImages.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [pendingImages],
  );

  useEffect(() => {
    return () => {
      pendingImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    };
  }, [pendingImagePreviews]);

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === 'animalType') {
      setForm((prev) => ({ ...prev, animalType: Number(value) as AnimalTypeCode }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) => file.type.startsWith('image/'));
    const availableSlots = MAX_SHELTER_IMAGES - selectedImageCount;
    if (availableSlots > 0) {
      setPendingImages((prev) => [...prev, ...files.slice(0, availableSlots)]);
    }
    event.target.value = '';
  };

  const handleCompletePostcode = (data: {
    address: string;
    addressType?: string;
    bname?: string;
    buildingName?: string;
    sido?: string;
    sigungu?: string;
  }) => {
    let fullAddress = data.address;
    let extraAddress = '';
    if (data.addressType === 'R') {
      if (data.bname) extraAddress += data.bname;
      if (data.buildingName) extraAddress += extraAddress ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress ? ` (${extraAddress})` : '';
    }

    setForm((prev) => ({
      ...prev,
      address: fullAddress,
      sido: data.sido ?? prev.sido,
      sigungu: data.sigungu ?? prev.sigungu,
    }));

    const w = window as Window & {
      kakao?: {
        maps: {
          services: {
            Geocoder: new () => {
              addressSearch: (address: string, callback: (result: { y: string; x: string }[], status: string) => void) => void;
            };
            Status: { OK: string };
          };
        };
      };
    };

    if (w.kakao?.maps?.services) {
      const geocoder = new w.kakao.maps.services.Geocoder();
      geocoder.addressSearch(fullAddress, (result, status) => {
        if (status === w.kakao!.maps.services.Status.OK && result[0]) {
          setForm((prev) => ({ ...prev, latitude: result[0].y, longitude: result[0].x }));
        }
      });
    }
  };

  const validate = (): string => {
    if (!form.name.trim()) return '보호소 이름을 입력해 주세요.';
    const fullAddress = `${form.address.trim()} ${form.addressDetail.trim()}`.trim();
    if (!fullAddress) return '주소를 입력해 주세요.';
    if (!form.applicantId.trim()) return '등록자를 입력해 주세요.';

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '위도와 경도를 입력해 주세요.';
    if (latitude < -90 || latitude > 90) return '위도는 -90~90 사이여야 합니다.';
    if (longitude < -180 || longitude > 180) return '경도는 -180~180 사이여야 합니다.';

    const phone = form.phoneNumber.trim();
    if (phone && !PHONE_NUMBER_REGEX.test(phone)) return '전화번호 형식이 올바르지 않습니다.';
    if ((form.operatingStart && !form.operatingEnd) || (!form.operatingStart && form.operatingEnd)) {
      return '운영 시작 시간과 종료 시간을 모두 입력하거나 모두 비워 주세요.';
    }

    return '';
  };

  const uploadPendingImages = async () => {
    const uploadedUrls: string[] = [];
    for (const file of pendingImages) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
      const ownerFolder = isCreateMode ? 'new' : String(baseShelter.id);
      const path = `${ownerFolder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

      const { error } = await supabase.storage
        .from(SHELTER_IMAGE_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;

      const { data } = supabase.storage.from(SHELTER_IMAGE_BUCKET).getPublicUrl(path);
      uploadedUrls.push(data.publicUrl);
    }
    return uploadedUrls;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSaving(true);
    try {
      const currentUser = await getCurrentUserRole();
      if (currentUser.role !== ADMIN_ROLE) {
        throw new Error(`현재 계정의 role이 ADMIN이 아닙니다. user=${currentUser.userId ?? '없음'}, role=${currentUser.role ?? '없음'}`);
      }

      const fullAddress = `${form.address.trim()} ${form.addressDetail.trim()}`.trim();
      const uploadedUrls = await uploadPendingImages();
      const nextImageUrls = [...imageUrls, ...uploadedUrls].slice(0, MAX_SHELTER_IMAGES);
      const payload = {
        name: form.name.trim(),
        address: fullAddress,
        sido: form.sido.trim() || null,
        sigungu: form.sigungu.trim() || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        phone_number: form.phoneNumber.trim() || null,
        description: form.description.trim() || null,
        link_url: form.linkUrl.trim() || null,
        applicant_id: form.applicantId.trim(),
        animal_type: form.animalType,
        use_yn: form.useYn,
        operating_hours: buildOperatingHours(form.operatingStart, form.operatingEnd),
        image_urls: nextImageUrls,
        updated_at: new Date().toISOString(),
      };

      if (isCreateMode) {
        const { count, error } = await supabase
          .from('shelters')
          .insert({
            ...payload,
            aprv_status: 'Y',
            del_yn: 'N',
            created_at: new Date().toISOString(),
            applied_at: null,
          }, { count: 'exact' });
        if (error) throw error;
        if (count === 0) throw new Error('보호소 등록이 DB에 반영되지 않았습니다. shelters insert RLS 정책을 확인해 주세요.');
        setImageUrls(nextImageUrls);
        setPendingImages([]);
        onSaved();
        return;
      }

      const { data: updatedShelter, error } = await supabase
        .rpc('admin_update_shelter', {
          p_payload: {
            id: baseShelter.id,
            name: payload.name,
            address: payload.address,
            sido: payload.sido ?? '',
            sigungu: payload.sigungu ?? '',
            latitude: payload.latitude,
            longitude: payload.longitude,
            phone_number: payload.phone_number ?? '',
            description: payload.description ?? '',
            link_url: payload.link_url ?? '',
            applicant_id: payload.applicant_id,
            animal_type: payload.animal_type,
            use_yn: payload.use_yn,
            operating_hours: payload.operating_hours ?? '',
            image_urls: nextImageUrls,
          },
        });
      if (error) throw error;
      if (!updatedShelter) {
        throw new Error(`보호소 수정 결과가 비어 있습니다. shelter_id=${baseShelter.id}, user=${currentUser.userId}, role=${currentUser.role}. Supabase SQL 정책을 다시 실행해 주세요.`);
      }

      const savedShelter = updatedShelter as ShelterForEdit;
      const savedImageUrls = normalizeImageUrls(savedShelter.image_urls).slice(0, MAX_SHELTER_IMAGES);
      setImageUrls(savedImageUrls.length > 0 ? savedImageUrls : nextImageUrls);
      setPendingImages([]);
      onSaved({
        ...savedShelter,
        image_urls: savedImageUrls.length > 0 ? savedImageUrls : nextImageUrls,
      });
    } catch (error) {
      const message = getSupabaseErrorMessage(error);
      console.error('Shelter save failed:', error);
      setErrorMessage(`저장 중 오류가 발생했습니다: ${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="space-y-4 text-left" onSubmit={handleSubmit}>
      {kakaoLoading ? <p className="text-xs text-muted-foreground">주소 검색 기능을 불러오는 중입니다.</p> : null}
      {kakaoError ? (
        <p className="text-xs text-amber-700">주소 검색을 불러오지 못했습니다. 좌표는 직접 입력해 주세요.</p>
      ) : null}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">등록자 *</label>
        <Input name="applicantId" value={form.applicantId} onChange={handleChange} required className="h-9 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">보호소 이름 *</label>
        <Input name="name" value={form.name} onChange={handleChange} required maxLength={120} className="h-9 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">유형 *</label>
        <select
          name="animalType"
          value={String(form.animalType)}
          onChange={handleChange}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="1">강아지</option>
          <option value="2">고양이</option>
          <option value="3">혼합</option>
        </select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-xs font-medium text-gray-600">보호소 이미지</label>
          <span className="text-[11px] text-muted-foreground">{selectedImageCount}/{MAX_SHELTER_IMAGES}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">이미지는 저장 버튼을 눌러야 새로고침 후에도 유지됩니다.</p>
        {selectedImageCount > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {imageUrls.map((url) => (
              <div key={url} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                <img src={url} alt="보호소 이미지" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImageUrls((prev) => prev.filter((item) => item !== url))}
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white sm:opacity-0 sm:transition sm:group-hover:opacity-100"
                  aria-label="이미지 삭제"
                >
                  ×
                </button>
              </div>
            ))}
            {pendingImagePreviews.map((preview, index) => (
              <div
                key={`${preview.file.name}-${index}`}
                className="relative aspect-square overflow-hidden rounded-lg border border-dashed border-emerald-200 bg-emerald-50"
              >
                <img src={preview.url} alt="저장 예정 보호소 이미지" className="h-full w-full object-cover opacity-80" />
                <span className="absolute inset-x-1 bottom-1 rounded bg-emerald-700/80 px-1 py-0.5 text-center text-[10px] font-semibold text-white">
                  저장 예정
                </span>
                <button
                  type="button"
                  onClick={() => setPendingImages((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                  aria-label="선택 이미지 삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : null}
        <Input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageChange}
          disabled={selectedImageCount >= MAX_SHELTER_IMAGES}
          className="h-10 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-emerald-700"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">주소 *</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            name="address"
            value={form.address}
            onChange={handleChange}
            readOnly={kakaoReady}
            className={`h-10 flex-1 text-sm sm:h-9 ${kakaoReady ? 'cursor-not-allowed bg-muted/50' : ''}`}
            placeholder={kakaoReady ? '주소 검색 버튼으로 입력' : '주소를 입력하거나 검색해 주세요'}
            required
          />
          <Button
            type="button"
            variant="secondary"
            className="h-10 shrink-0 whitespace-nowrap text-xs sm:h-9"
            disabled={!kakaoReady}
            onClick={() => openPostcodePopup({ onComplete: handleCompletePostcode })}
          >
            주소 검색
          </Button>
        </div>
        <Input
          name="addressDetail"
          value={form.addressDetail}
          onChange={handleChange}
          placeholder="상세 주소"
          maxLength={100}
          className="h-9 text-sm"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-600">위도/경도 *</span>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={isLatLngEditable}
              onChange={(event) => setIsLatLngEditable(event.target.checked)}
              className="rounded border-gray-300"
            />
            직접 수정
          </label>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Input
            type="number"
            name="latitude"
            value={form.latitude}
            onChange={handleChange}
            readOnly={kakaoReady && !isLatLngEditable}
            className={`h-9 text-sm ${kakaoReady && !isLatLngEditable ? 'bg-muted/80' : ''}`}
            placeholder="위도"
            step="any"
            required
          />
          <Input
            type="number"
            name="longitude"
            value={form.longitude}
            onChange={handleChange}
            readOnly={kakaoReady && !isLatLngEditable}
            className={`h-9 text-sm ${kakaoReady && !isLatLngEditable ? 'bg-muted/80' : ''}`}
            placeholder="경도"
            step="any"
            required
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">운영 시간</label>
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:flex-wrap">
          <Input
            type="time"
            value={form.operatingStart}
            onChange={(event) => setForm((prev) => ({ ...prev, operatingStart: event.target.value }))}
            className="h-10 w-full text-sm sm:h-9 sm:w-[7.5rem]"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <Input
            type="time"
            value={form.operatingEnd}
            onChange={(event) => setForm((prev) => ({ ...prev, operatingEnd: event.target.value }))}
            className="h-10 w-full text-sm sm:h-9 sm:w-[7.5rem]"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">사용 여부 *</label>
        <div className="flex gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              checked={form.useYn === 'Y'}
              onChange={() => setForm((prev) => ({ ...prev, useYn: 'Y' }))}
              className="border-gray-300"
            />
            사용 중
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              checked={form.useYn === 'N'}
              onChange={() => setForm((prev) => ({ ...prev, useYn: 'N' }))}
              className="border-gray-300"
            />
            미사용
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">연락처</label>
        <Input name="phoneNumber" value={form.phoneNumber} onChange={handleChange} maxLength={20} className="h-9 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">링크 URL</label>
        <Input type="url" name="linkUrl" value={form.linkUrl} onChange={handleChange} className="h-9 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">상세 설명</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          maxLength={1000}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {errorMessage ? <p className="text-sm font-medium text-destructive">{errorMessage}</p> : null}

      <div className="grid grid-cols-2 gap-2 border-t pt-3 sm:flex sm:justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving} className="h-10 sm:h-9">
          취소
        </Button>
        <Button type="submit" size="sm" className="h-10 bg-emerald-600 hover:bg-emerald-700 sm:h-9" disabled={saving}>
          {saving ? '저장 중...' : isCreateMode ? '등록하기' : '저장'}
        </Button>
      </div>
    </form>
  );
}
