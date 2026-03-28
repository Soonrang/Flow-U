// src/app/map/page.tsx
'use client';

import { ChangeEvent, FormEvent, useState } from 'react';
import { Search, Plus, List } from 'lucide-react';
import MapCustomMarker from '@/src/components/MapCustomMarker'; // 경로 확인
import { supabase } from '@/src/utils/supabase'; // 경로 확인
// 💡 카카오 주소->좌표 변환을 위해 libraries=['services'] 가 반드시 필요합니다.
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk';
import { useDaumPostcodePopup } from 'react-daum-postcode';

type MarkerType = 'cat' | 'dog' | 'mixed';

interface Shelter {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: MarkerType;
}

interface ShelterRequestForm {
    name: string;
    address: string;
    addressDetail: string; 
    sido: string;
    sigungu: string;
    latitude: string;
    longitude: string;
    phoneNumber: string;
    description: string;
    linkUrl: string;
    applicantId: string;
  }

  const INITIAL_SHELTER_REQUEST_FORM: ShelterRequestForm = {
    name: '',
    address: '',
    addressDetail: '', 
    sido: '',
    sigungu: '',
    latitude: '',
    longitude: '',
    phoneNumber: '',
    description: '',
    linkUrl: '',
    applicantId: '',
  };

const PHONE_NUMBER_REGEX = /^[0-9+\-()\s]{8,20}$/;

const dummyShelters: Shelter[] = [
  { id: 1, name: '플로우 고양이 쉼터', lat: 37.3614, lng: 126.9351, type: 'cat' },
  { id: 2, name: '희망 강아지 보호소', lat: 37.3580, lng: 126.9330, type: 'dog' },
  { id: 3, name: '다함께 동물센터', lat: 37.3650, lng: 126.9400, type: 'mixed' },
];

export default function MapPage() {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isShelterRequestModalOpen, setIsShelterRequestModalOpen] = useState(false);
  const [shelterRequestForm, setShelterRequestForm] = useState<ShelterRequestForm>(INITIAL_SHELTER_REQUEST_FORM);
  const [isSubmittingShelterRequest, setIsSubmittingShelterRequest] = useState(false);
  const [shelterRequestErrorMessage, setShelterRequestErrorMessage] = useState('');
  const [isShelterRequestSuccess, setIsShelterRequestSuccess] = useState(false);
  
  // 💡 위경도 수동 입력 체크박스 상태
  const [isLatLngEditable, setIsLatLngEditable] = useState(false);

  // 다음 우편번호 팝업 훅
  const openPostcodePopup = useDaumPostcodePopup();

  // 💡 services 라이브러리 추가 (Geocoder 사용을 위함)
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_APP_KEY as string,
    libraries: ['services'],
  });

  const handleShelterRequestInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = event.target;
    setShelterRequestForm((prev) => ({ ...prev, [name]: value }));
  };

  // 💡 주소 검색 완료 핸들러
  const handleCompletePostcode = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }

    // 주소 입력 업데이트
    setShelterRequestForm((prev) => ({
      ...prev,
      address: fullAddress,
      sido: data.sido,       // 도/시 추출 (DB 스키마 맞춤)
      sigungu: data.sigungu, // 시/군/구 추출
    }));

    // 카카오 Geocoder로 주소 -> 위경도 변환
    if (window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(fullAddress, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          setShelterRequestForm((prev) => ({
            ...prev,
            latitude: result[0].y,
            longitude: result[0].x,
          }));
        }
      });
    }
  };

  const validateShelterRequestForm = () => {
    const trimmedName = shelterRequestForm.name.trim();
    const trimmedAddress = shelterRequestForm.address.trim();
    const trimmedPhoneNumber = shelterRequestForm.phoneNumber.trim();
    const trimmedApplicantId = shelterRequestForm.applicantId.trim();

    if (!trimmedName) return '보호소 이름은 필수입니다.';
    if (!trimmedAddress) return '주소는 필수입니다.';
    if (!trimmedApplicantId) return '신청자 아이디는 필수입니다.';

    const parsedLatitude = Number(shelterRequestForm.latitude);
    const parsedLongitude = Number(shelterRequestForm.longitude);

    if (!Number.isFinite(parsedLatitude) || !Number.isFinite(parsedLongitude)) {
      return '주소를 검색하거나 위경도를 숫자로 입력해 주세요.';
    }

    if (parsedLatitude < -90 || parsedLatitude > 90) return '위도는 -90에서 90 사이여야 합니다.';
    if (parsedLongitude < -180 || parsedLongitude > 180) return '경도는 -180에서 180 사이여야 합니다.';

    if (trimmedPhoneNumber && !PHONE_NUMBER_REGEX.test(trimmedPhoneNumber)) {
      return '전화번호 형식이 올바르지 않습니다.';
    }

    return '';
  };

  const closeShelterRequestModal = () => {
    setIsShelterRequestModalOpen(false);
    setShelterRequestErrorMessage('');
    setIsShelterRequestSuccess(false);
    setShelterRequestForm(INITIAL_SHELTER_REQUEST_FORM);
    setIsLatLngEditable(false);
  };

  const handleShelterRequestSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShelterRequestErrorMessage('');
    setIsShelterRequestSuccess(false);

    const validationErrorMessage = validateShelterRequestForm();
    if (validationErrorMessage) {
      setShelterRequestErrorMessage(validationErrorMessage);
      return;
    }

    setIsSubmittingShelterRequest(true);

    try {
        // 기본 주소와 상세 주소를 합칩니다.
        const fullAddress = `${shelterRequestForm.address.trim()} ${shelterRequestForm.addressDetail.trim()}`.trim();
  
        const payload = {
          name: shelterRequestForm.name.trim(),
          address: fullAddress, // 👈 합친 주소를 DB의 address 컬럼에 저장
          sido: shelterRequestForm.sido,
          sigungu: shelterRequestForm.sigungu,
          latitude: Number(shelterRequestForm.latitude),
          longitude: Number(shelterRequestForm.longitude),
          phone_number: shelterRequestForm.phoneNumber.trim() || null,
          description: shelterRequestForm.description.trim() || null,
          link_url: shelterRequestForm.linkUrl.trim() || null,
          applicant_id: shelterRequestForm.applicantId.trim(),
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };

      const { error: insertError } = await supabase.from('shelters').insert(payload);

      if (insertError) {
        console.error(insertError);
        setShelterRequestErrorMessage('등록 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
        return;
      }

      setIsShelterRequestSuccess(true);
      setShelterRequestForm(INITIAL_SHELTER_REQUEST_FORM);
    } catch {
      setShelterRequestErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmittingShelterRequest(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">지도를 불러오는 중...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">지도를 불러오지 못했습니다. 앱 키를 확인해 주세요.</div>;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Map
        center={{ lat: 37.3614, lng: 126.9351 }}
        style={{ width: '100%', height: '100%' }}
        level={4}
      >
        {dummyShelters.map((shelter) => (
          <CustomOverlayMap
            key={shelter.id}
            position={{ lat: shelter.lat, lng: shelter.lng }}
            yAnchor={1} 
          >
            <MapCustomMarker type={shelter.type} />
          </CustomOverlayMap>
        ))}
      </Map>

      {/* 상단 검색창 오버레이 */}
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

      {/* 우측 하단 플로팅 버튼 */}
      <div className="absolute bottom-8 right-6 z-10 flex flex-col gap-3">
        <button 
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-gray-700 shadow-xl transition-transform hover:scale-105"
          title="보호소 목록 보기"
        >
          <List className="h-6 w-6" />
        </button>
        
        <button 
          className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-500 text-white shadow-xl transition-transform hover:scale-105"
          title="새로운 보호소 등록"
          onClick={() => setIsShelterRequestModalOpen(true)}
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>

      {/* 등록 모달 */}
      {isShelterRequestModalOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/45 px-5 py-5">
          {/* 높이가 길어질 수 있으므로 스크롤 가능하게 max-h-full과 overflow-y-auto 추가 */}
          <div className="w-full max-w-md max-h-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">보호소 등록 신청</h2>
            <p className="mt-3 text-sm leading-6 text-gray-600">
              보호소 등록은 즉시 공개되지 않고, 관리자 승인 후 지도에 노출됩니다.
            </p>
            
            <form className="mt-5 space-y-4" onSubmit={handleShelterRequestSubmit}>
              {/* 1. 신청자 아이디 */}
              <input
                type="text"
                name="applicantId"
                value={shelterRequestForm.applicantId}
                onChange={handleShelterRequestInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="신청자 아이디 *"
                required
              />

              {/* 2. 보호소 이름 */}
              <input
                type="text"
                name="name"
                value={shelterRequestForm.name}
                onChange={handleShelterRequestInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="보호소 이름 *"
                maxLength={120}
                required
              />

              {/* 3. 주소 및 주소 검색 버튼 */}
              <div className="space-y-2">
                {/* 3-1. 기본 주소 (읽기 전용) */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    name="address"
                    value={shelterRequestForm.address}
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm outline-none cursor-not-allowed"
                    placeholder="주소 (버튼을 눌러 검색하세요) *"
                    readOnly
                    required
                  />
                  <button
                    type="button"
                    className="whitespace-nowrap rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-700"
                    onClick={() => openPostcodePopup({ onComplete: handleCompletePostcode })}
                  >
                    주소 검색
                  </button>
                </div>
                
                {/* 3-2. 상세 주소 (직접 입력) */}
                <input
                  type="text"
                  name="addressDetail"
                  value={shelterRequestForm.addressDetail}
                  onChange={handleShelterRequestInputChange}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                  placeholder="상세 주소 (예: 101동 202호, 2층 안쪽 등)"
                  maxLength={100}
                />
              </div>

              {/* 4. 위도/경도 및 직접 수정 체크박스 */}
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">자동 변환된 좌표</span>
                  <label className="flex items-center space-x-2 text-xs text-gray-600">
                    <input 
                      type="checkbox" 
                      checked={isLatLngEditable}
                      onChange={(e) => setIsLatLngEditable(e.target.checked)}
                      className="rounded text-blue-500 focus:ring-blue-500"
                    />
                    <span>직접 수정하기</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    name="latitude"
                    value={shelterRequestForm.latitude}
                    onChange={handleShelterRequestInputChange}
                    className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 ${!isLatLngEditable ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                    placeholder="위도"
                    step="any"
                    readOnly={!isLatLngEditable}
                    required
                  />
                  <input
                    type="number"
                    name="longitude"
                    value={shelterRequestForm.longitude}
                    onChange={handleShelterRequestInputChange}
                    className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 ${!isLatLngEditable ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`}
                    placeholder="경도"
                    step="any"
                    readOnly={!isLatLngEditable}
                    required
                  />
                </div>
              </div>

              {/* 5. 연락처 */}
              <input
                type="text"
                name="phoneNumber"
                value={shelterRequestForm.phoneNumber}
                onChange={handleShelterRequestInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="연락처 (선택)"
                maxLength={20}
              />

              {/* 6. LINK URL */}
              <input
                type="url"
                name="linkUrl"
                value={shelterRequestForm.linkUrl}
                onChange={handleShelterRequestInputChange}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="보호소 관련 링크 URL (선택)"
              />

              {/* 7. 상세 설명 */}
              <textarea
                name="description"
                value={shelterRequestForm.description}
                onChange={handleShelterRequestInputChange}
                className="h-20 w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
                placeholder="상세 설명 (선택)"
                maxLength={1000}
              />

              {shelterRequestErrorMessage && (
                <p className="text-sm font-medium text-red-600">{shelterRequestErrorMessage}</p>
              )}

              {isShelterRequestSuccess && (
                <p className="text-sm font-medium text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                  ✅ 등록 신청 완료! 관리자 승인 후 지도에 노출됩니다.
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  onClick={closeShelterRequestModal}
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingShelterRequest}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {isSubmittingShelterRequest ? '신청 중...' : '등록 신청하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}