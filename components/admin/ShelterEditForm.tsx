'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { useKakaoLoader } from 'react-kakao-maps-sdk';
import { supabase } from '@/lib/supabase';
import { type AnimalTypeCode, normalizeAnimalType } from '@/lib/animalType';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PHONE_NUMBER_REGEX = /^[0-9+\-()\s]{8,20}$/;

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
  /** 1=강아지, 2=고양이, 3=혼합 */
  animal_type?: number | null;
  operating_hours?: string | null;
  use_yn?: string | null;
  del_yn?: string | null;
  aprv_status: string;
  created_at: string;
  applied_at: string | null;
};

function parseOperatingHours(value: string | null | undefined): { start: string; end: string } {
  const raw = value?.trim() ?? '';
  if (!raw) return { start: '', end: '' };
  const compact = raw.match(/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
  if (compact) {
    return { start: padHm(compact[1]), end: padHm(compact[2]) };
  }
  const parts = raw.split(/\s*-\s*/);
  if (parts.length >= 2) {
    return { start: padHm(parts[0].trim()), end: padHm(parts[1].trim()) };
  }
  return { start: '', end: '' };
}

function padHm(t: string): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

function buildOperatingHours(start: string, end: string): string | null {
  const s = start.trim();
  const e = end.trim();
  if (!s || !e) return null;
  return `${s} - ${e}`;
}

interface ShelterEditFormProps {
  shelter: ShelterForEdit;
  onSaved: (row: ShelterForEdit) => void;
  onCancel: () => void;
}

export function ShelterEditForm({ shelter, onSaved, onCancel }: ShelterEditFormProps) {
  const openPostcodePopup = useDaumPostcodePopup();
  const { start: ohStart, end: ohEnd } = parseOperatingHours(shelter.operating_hours);

  const [form, setForm] = useState({
    name: shelter.name,
    address: shelter.address ?? '',
    addressDetail: '',
    sido: shelter.sido ?? '',
    sigungu: shelter.sigungu ?? '',
    latitude: shelter.latitude != null ? String(shelter.latitude) : '',
    longitude: shelter.longitude != null ? String(shelter.longitude) : '',
    phoneNumber: shelter.phone_number ?? '',
    description: shelter.description ?? '',
    linkUrl: shelter.link_url ?? '',
    applicantId: shelter.applicant_id ?? '',
    animal_type: normalizeAnimalType(shelter.animal_type, shelter.id),
    use_yn: shelter.use_yn === 'N' ? 'N' : 'Y',
    operatingStart: ohStart,
    operatingEnd: ohEnd,
  });

  const [isLatLngEditable, setIsLatLngEditable] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const [kakaoLoading, kakaoError] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_APP_KEY as string,
    libraries: ['services'],
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === 'animal_type') {
      setForm((prev) => ({ ...prev, animal_type: Number(value) as AnimalTypeCode }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
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
      if (data.buildingName) {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }
    setForm((prev) => ({
      ...prev,
      address: fullAddress,
      sido: data.sido ?? prev.sido,
      sigungu: data.sigungu ?? prev.sigungu,
    }));

    const w = window as Window & { kakao?: { maps: { services: { Geocoder: new () => { addressSearch: (addr: string, cb: (result: { y: string; x: string }[], status: string) => void) => void }; Status: { OK: string } } } } };
    if (typeof window !== 'undefined' && w.kakao?.maps?.services) {
      const geocoder = new w.kakao.maps.services.Geocoder();
      geocoder.addressSearch(fullAddress, (result, status) => {
        if (status === w.kakao!.maps.services.Status.OK && result[0]) {
          setForm((prev) => ({
            ...prev,
            latitude: result[0].y,
            longitude: result[0].x,
          }));
        }
      });
    }
  };

  const validate = (): string => {
    if (!form.name.trim()) return '보호소 이름은 필수입니다.';
    const fullAddress = `${form.address.trim()} ${form.addressDetail.trim()}`.trim();
    if (!fullAddress) return '주소는 필수입니다.';
    if (!form.applicantId.trim()) return '신청자 아이디는 필수입니다.';

    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return '위도·경도를 숫자로 입력하거나 주소 검색으로 좌표를 채워 주세요.';
    }
    if (lat < -90 || lat > 90) return '위도는 -90~90 사이여야 합니다.';
    if (lng < -180 || lng > 180) return '경도는 -180~180 사이여야 합니다.';

    const phone = form.phoneNumber.trim();
    if (phone && !PHONE_NUMBER_REGEX.test(phone)) return '전화번호 형식이 올바르지 않습니다.';

    const { operatingStart, operatingEnd } = form;
    if ((operatingStart && !operatingEnd) || (!operatingStart && operatingEnd)) {
      return '운영 시작·종료 시간을 모두 입력하거나 둘 다 비워 주세요.';
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');
    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    const fullAddress = `${form.address.trim()} ${form.addressDetail.trim()}`.trim();
    const operating_hours = buildOperatingHours(form.operatingStart, form.operatingEnd);

    setSaving(true);
    try {
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
        animal_type: form.animal_type,
        use_yn: form.use_yn,
        operating_hours,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('shelters').update(payload).eq('id', shelter.id);
      if (error) throw error;

      onSaved({
        ...shelter,
        name: payload.name,
        address: fullAddress,
        sido: payload.sido,
        sigungu: payload.sigungu,
        latitude: payload.latitude,
        longitude: payload.longitude,
        phone_number: payload.phone_number,
        description: payload.description,
        link_url: payload.link_url,
        applicant_id: payload.applicant_id,
        animal_type: form.animal_type,
        use_yn: form.use_yn,
        operating_hours,
      });
    } catch {
      setErrorMessage('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    } finally {
      setSaving(false);
    }
  };

  const kakaoReady = !kakaoLoading && !kakaoError;

  return (
    <form className="space-y-3 text-left" onSubmit={handleSubmit}>
      {kakaoLoading && (
        <p className="text-xs text-muted-foreground">주소·좌표 기능을 불러오는 중입니다…</p>
      )}
      {kakaoError && (
        <p className="text-xs text-amber-700">
          카카오맵 키를 불러오지 못했습니다. 위·경도는 직접 입력해 주세요.
        </p>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">신청자 아이디 *</label>
        <Input name="applicantId" value={form.applicantId} onChange={handleChange} required className="h-9 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">보호소 이름 *</label>
        <Input name="name" value={form.name} onChange={handleChange} required maxLength={120} className="h-9 text-sm" />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">동물 유형 *</label>
        <select
          name="animal_type"
          value={String(form.animal_type)}
          onChange={handleChange}
          className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="1">🐶 강아지 (1)</option>
          <option value="2">🐱 고양이 (2)</option>
          <option value="3">🐾 혼합 (3)</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-gray-600">주소 *</label>
        <div className="flex gap-2">
          <Input
            name="address"
            value={form.address}
            onChange={handleChange}
            readOnly={kakaoReady}
            className={`h-9 flex-1 text-sm ${kakaoReady ? 'cursor-not-allowed bg-muted/50' : ''}`}
            placeholder={kakaoReady ? '주소 검색 버튼으로 입력' : '주소를 입력하거나 검색하세요'}
            required
          />
          <Button
            type="button"
            variant="secondary"
            className="h-9 shrink-0 whitespace-nowrap text-xs"
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
          placeholder="상세 주소 (동·호수 등)"
          maxLength={100}
          className="h-9 text-sm"
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-muted/30 p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-gray-600">위도·경도 *</span>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={isLatLngEditable}
              onChange={(e) => setIsLatLngEditable(e.target.checked)}
              className="rounded border-gray-300"
            />
            직접 수정
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
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
        <label className="mb-1 block text-xs font-medium text-gray-600">운영 시간 (선택)</label>
        <p className="mb-1.5 text-[11px] text-muted-foreground">시작·종료를 선택하면 &quot;10:00 - 17:00&quot; 형식으로 저장됩니다.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="time"
            value={form.operatingStart}
            onChange={(e) => setForm((p) => ({ ...p, operatingStart: e.target.value }))}
            className="h-9 w-[7.5rem] text-sm"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <Input
            type="time"
            value={form.operatingEnd}
            onChange={(e) => setForm((p) => ({ ...p, operatingEnd: e.target.value }))}
            className="h-9 w-[7.5rem] text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">사용 여부 *</label>
        <div className="flex gap-4 text-sm">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="use_yn_radio"
              checked={form.use_yn === 'Y'}
              onChange={() => setForm((p) => ({ ...p, use_yn: 'Y' }))}
              className="border-gray-300"
            />
            사용 중
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="use_yn_radio"
              checked={form.use_yn === 'N'}
              onChange={() => setForm((p) => ({ ...p, use_yn: 'N' }))}
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

      <div className="flex justify-end gap-2 border-t pt-3">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={saving}>
          취소
        </Button>
        <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700" disabled={saving}>
          {saving ? '저장 중…' : '저장'}
        </Button>
      </div>
    </form>
  );
}
