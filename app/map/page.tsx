// src/app/map/page.tsx
'use client';

import { ChangeEvent, FormEvent, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, MapPin, Phone, Clock, PawPrint, AlertCircle, User, LogOut } from 'lucide-react';
import Image from 'next/image';

const AVATAR_PATHS = Array.from({ length: 10 }, (_, i) => `/avatars/avatar-${i + 1}.PNG`);
import MapCustomMarker from '@/components/MapCustomMarker';
import { supabase } from '@/lib/supabase';
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import { ANIMAL_TYPE_DOG, type AnimalTypeCode } from '@/lib/animalType';

interface Shelter {
  id: number;
  name: string;
  lat: number;
  lng: number;
  type: AnimalTypeCode;
  address: string;
  phone: string;
  hours: string;
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
  animalType: AnimalTypeCode;
}

const INITIAL_SHELTER_REQUEST_FORM: ShelterRequestForm = {
  name: '', address: '', addressDetail: '', sido: '', sigungu: '',
  latitude: '', longitude: '', phoneNumber: '', description: '', linkUrl: '', applicantId: '',
  animalType: ANIMAL_TYPE_DOG,
};

const PHONE_NUMBER_REGEX = /^[0-9+\-()\s]{8,20}$/;

const ANIMAL_BADGE_CLASS: Record<string, string> = {
  1: "bg-blue-50 text-blue-600 border-blue-200",
  2: "bg-pink-50 text-pink-600 border-pink-200",
  3: "bg-emerald-50 text-emerald-600 border-emerald-200",
};

const ANIMAL_LABEL: Record<string, string> = {
  1: "🐶 강아지",
  2: "🐱 고양이",
  3: "🐾 혼합",
};

export default function MapPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [avatarIndex, setAvatarIndex] = useState<number | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [isShelterRequestModalOpen, setIsShelterRequestModalOpen] = useState(false);
  const [shelterRequestForm, setShelterRequestForm] = useState<ShelterRequestForm>(INITIAL_SHELTER_REQUEST_FORM);
  const [isSubmittingShelterRequest, setIsSubmittingShelterRequest] = useState(false);
  const [shelterRequestErrorMessage, setShelterRequestErrorMessage] = useState('');
  const [isShelterRequestSuccess, setIsShelterRequestSuccess] = useState(false);
  const [isLatLngEditable, setIsLatLngEditable] = useState(false);
  const [shelters, setShelters] = useState<Shelter[]>([]);

  const openPostcodePopup = useDaumPostcodePopup();
  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_APP_KEY as string,
    libraries: ['services'],
  });

  const fetchUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from('users')
      .select('nickname, avatar_index')
      .eq('id', userId)
      .single();
    if (data) {
      setNickname(data.nickname || '');
      setAvatarIndex(data.avatar_index ?? null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchUserProfile(session.user.id);
      else { setNickname(''); setAvatarIndex(null); }
    });

    fetchMapMarkers();

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchMapMarkers = async () => {
    try {
      const { data, error } = await supabase
        .from('shelters')
        .select('id, name, latitude, longitude, animal_type, address, phone_number, operating_hours')
        .eq('use_yn', 'Y')
        .eq('aprv_status', 'Y')
        .or('del_yn.eq.N,del_yn.is.null')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedShelters: Shelter[] = data.map((s) => ({
          id: s.id,
          name: s.name,
          lat: s.latitude,
          lng: s.longitude,
          type: Number(s.animal_type) as AnimalTypeCode,
          address: s.address || '',
          phone: s.phone_number || '',
          hours: s.operating_hours || '',
        }));
        setShelters(mappedShelters);
      }
    } catch (err) {
      console.error('지도 마커 데이터를 불러오는데 실패했습니다.', err);
    }
  };

  const filteredShelters = shelters.filter(s => 
    s.name.includes(searchKeyword) || s.address.includes(searchKeyword)
  );

  const handleRegisterClick = () => {
    if (user) {
      setIsShelterRequestModalOpen(true);
    } else {
      setIsLoginModalOpen(true);
    }
  };

  // 🚀 수정됨: 억지로 넣었던 scopes 속성을 제거 (카카오 디벨로퍼스 설정으로 해결)
  const handleKakaoLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/map`
      }
    });
    if (error) {
      console.error('로그인 에러:', error.message);
      alert('로그인 처리 중 문제가 발생했습니다.');
    }
  };

  const handleShelterRequestInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'animalType') {
      setShelterRequestForm(prev => ({ ...prev, animalType: Number(value) as AnimalTypeCode }));
      return;
    }
    setShelterRequestForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCompletePostcode = (data: any) => {
    let fullAddress = data.address;
    let extraAddress = '';
    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname;
      if (data.buildingName !== '') extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName;
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : '';
    }
    setShelterRequestForm(prev => ({ ...prev, address: fullAddress, sido: data.sido, sigungu: data.sigungu }));

    if (window.kakao && window.kakao.maps.services) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.addressSearch(fullAddress, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          setShelterRequestForm(prev => ({ ...prev, latitude: result[0].y, longitude: result[0].x }));
        }
      });
    }
  };

  const validateShelterRequestForm = () => {
    if (!shelterRequestForm.name.trim()) return '보호소 이름은 필수입니다.';
    if (!shelterRequestForm.address.trim()) return '주소는 필수입니다.';
    if (!shelterRequestForm.applicantId.trim()) return '신청자 아이디는 필수입니다.';
    const lat = Number(shelterRequestForm.latitude);
    const lng = Number(shelterRequestForm.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '주소를 검색하거나 위경도를 숫자로 입력해 주세요.';
    if (lat < -90 || lat > 90) return '위도는 -90에서 90 사이여야 합니다.';
    if (lng < -180 || lng > 180) return '경도는 -180에서 180 사이여야 합니다.';
    if (shelterRequestForm.phoneNumber.trim() && !PHONE_NUMBER_REGEX.test(shelterRequestForm.phoneNumber.trim())) {
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

  const handleShelterRequestSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShelterRequestErrorMessage('');
    setIsShelterRequestSuccess(false);

    const validationErrorMessage = validateShelterRequestForm();
    if (validationErrorMessage) {
      setShelterRequestErrorMessage(validationErrorMessage);
      return;
    }

    setIsSubmittingShelterRequest(true);
    try {
      const fullAddress = `${shelterRequestForm.address.trim()} ${shelterRequestForm.addressDetail.trim()}`.trim();
      const payload = {
        name: shelterRequestForm.name.trim(),
        address: fullAddress,
        sido: shelterRequestForm.sido,
        sigungu: shelterRequestForm.sigungu,
        latitude: Number(shelterRequestForm.latitude),
        longitude: Number(shelterRequestForm.longitude),
        phone_number: shelterRequestForm.phoneNumber.trim() || null,
        description: shelterRequestForm.description.trim() || null,
        link_url: shelterRequestForm.linkUrl.trim() || null,
        applicant_id: shelterRequestForm.applicantId.trim(),
        animal_type: String(shelterRequestForm.animalType),
        applied_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase.from('shelters').insert(payload);
      if (insertError) throw insertError;

      setIsShelterRequestSuccess(true);
      setShelterRequestForm(INITIAL_SHELTER_REQUEST_FORM);
    } catch {
      setShelterRequestErrorMessage('네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsSubmittingShelterRequest(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">지도를 불러오는 중...</div>;
  if (error) return <div className="flex h-screen items-center justify-center text-red-500">지도를 불러오지 못했습니다.</div>;

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
            <PawPrint className="w-6 h-6 text-emerald-500" />
            <span className="text-xl font-bold text-gray-900 tracking-tight">FlowU</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleRegisterClick}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-400 text-white text-sm font-semibold rounded-full hover:bg-emerald-500 transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">봉사 센터 등록</span>
              <span className="sm:hidden">등록</span>
            </button>

            {/* 프로필 영역 */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileMenuOpen(prev => !prev)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors border border-gray-200 shrink-0 overflow-hidden"
                  aria-label="프로필 메뉴"
                >
                  {avatarIndex !== null ? (
                    <Image
                      src={AVATAR_PATHS[avatarIndex - 1]}
                      alt="프로필"
                      width={36}
                      height={36}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {isProfileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-11 z-50 w-52 bg-white rounded-2xl shadow-lg border border-gray-100 py-1.5 overflow-hidden">
                      {/* 인사 문구 */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                        <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 shrink-0 overflow-hidden flex items-center justify-center">
                          {avatarIndex !== null ? (
                            <Image
                              src={AVATAR_PATHS[avatarIndex - 1]}
                              alt="프로필"
                              width={36}
                              height={36}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {nickname || '사용자'}님
                          </p>
                          <p className="text-xs text-gray-400 truncate">{user.email ?? ''}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { setIsProfileMenuOpen(false); router.push('/profile'); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-gray-400" />
                        내 프로필
                      </button>
                      <button
                        onClick={async () => { setIsProfileMenuOpen(false); await supabase.auth.signOut(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        로그아웃
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">주변 봉사 센터</h1>
            <p className="mt-1 text-sm text-gray-500">가까운 유기동물 봉사 센터를 찾아보세요</p>
          </div>
          
          <div className="w-full md:w-96 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="센터 이름 또는 지역 검색..." 
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="w-full h-[450px] md:h-[550px] rounded-2xl overflow-hidden border border-gray-200 shadow-sm relative z-0">
          <Map
            center={{ lat: 37.5326, lng: 127.0246 }} 
            style={{ width: '100%', height: '100%' }}
            level={8}
          >
            {filteredShelters.map((shelter) => (
              <CustomOverlayMap
                key={shelter.id}
                position={{ lat: shelter.lat, lng: shelter.lng }}
                yAnchor={1} 
              >
                <MapCustomMarker type={shelter.type} />
              </CustomOverlayMap>
            ))}
          </Map>
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-4 px-2">
          <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-[#f472b6]"></span> 고양이 보호소</div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-[#60a5fa]"></span> 강아지 보호소</div>
          <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span> 혼합 보호소</div>
        </div>

        <hr className="my-10 border-gray-200" />

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            센터 목록 <span className="text-blue-600 text-lg font-semibold">{filteredShelters.length}곳</span>
          </h2>

          {filteredShelters.length === 0 ? (
            <div className="py-20 text-center text-gray-400 bg-white rounded-2xl border border-gray-200 shadow-sm">
              조건에 맞는 보호소가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredShelters.map((shelter) => (
                <div key={shelter.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full group cursor-pointer">
                  
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                      {shelter.name}
                    </h3>
                    <span className={`shrink-0 px-2 py-1 text-xs font-semibold rounded-full border ${ANIMAL_BADGE_CLASS[shelter.type]}`}>
                      {ANIMAL_LABEL[shelter.type]}
                    </span>
                  </div>

                  <div className="space-y-2.5 text-sm text-gray-600 mt-auto">
                    <p className="flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed line-clamp-2">{shelter.address}</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      {shelter.phone || '-'}
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                      {shelter.hours || '운영시간 정보 없음'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 py-5 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 mb-5">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">로그인이 필요합니다</h2>
            <p className="text-sm text-gray-500 mb-8">
              로그인 후 센터 등록 신청이 가능합니다.
            </p>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleKakaoLogin}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FEE500] px-4 py-3.5 text-sm font-bold text-black/85 transition-colors hover:bg-[#FEE500]/90 shadow-sm"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path d="M12 3c-4.97 0-9 3.185-9 7.115 0 2.535 1.631 4.753 4.102 5.961-.137.49-4.398 14.072-4.525 14.475-.022.067-.024.167.042.222.046.038.106.04.156.031.144-.025 6.33-4.184 7.391-4.887.915.127 1.861.196 2.834.196 4.97 0 9-3.185 9-7.115C21 6.185 16.97 3 12 3z"/>
                </svg>
                카카오 로그인 하기
              </button>
              <button
                onClick={() => setIsLoginModalOpen(false)}
                className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {isShelterRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-5 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">보호소 등록 신청</h2>
            <p className="mt-2 text-sm text-gray-500">관리자 승인 후 지도에 노출됩니다.</p>
            
            <form className="mt-6 space-y-4" onSubmit={handleShelterRequestSubmit}>
              <input type="text" name="applicantId" value={shelterRequestForm.applicantId} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="신청자 아이디 *" required />
              <input type="text" name="name" value={shelterRequestForm.name} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="보호소 이름 *" maxLength={120} required />
              
              <div>
                <select name="animalType" value={String(shelterRequestForm.animalType)} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 text-gray-600" required>
                  <option value="1">강아지 (1)</option>
                  <option value="2">고양이 (2)</option>
                  <option value="3">혼합 (3)</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <input type="text" name="address" value={shelterRequestForm.address} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm outline-none cursor-not-allowed" placeholder="주소 *" readOnly required />
                  <button type="button" className="shrink-0 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500" onClick={() => openPostcodePopup({ onComplete: handleCompletePostcode })}>
                    주소 검색
                  </button>
                </div>
                <input type="text" name="addressDetail" value={shelterRequestForm.addressDetail} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="상세 주소" maxLength={100} />
              </div>

              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-500">자동 변환된 좌표</span>
                  <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={isLatLngEditable} onChange={(e) => setIsLatLngEditable(e.target.checked)} className="rounded text-gray-900 focus:ring-gray-900 cursor-pointer" />
                    <span>직접 수정하기</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" name="latitude" value={shelterRequestForm.latitude} onChange={handleShelterRequestInputChange} className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 ${!isLatLngEditable ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`} placeholder="위도" step="any" readOnly={!isLatLngEditable} required />
                  <input type="number" name="longitude" value={shelterRequestForm.longitude} onChange={handleShelterRequestInputChange} className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 ${!isLatLngEditable ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`} placeholder="경도" step="any" readOnly={!isLatLngEditable} required />
                </div>
              </div>

              <input type="text" name="phoneNumber" value={shelterRequestForm.phoneNumber} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="연락처 (선택)" maxLength={20} />
              <input type="url" name="linkUrl" value={shelterRequestForm.linkUrl} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="관련 링크 URL (선택)" />
              <textarea name="description" value={shelterRequestForm.description} onChange={handleShelterRequestInputChange} className="h-24 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900" placeholder="상세 설명 (선택)" maxLength={1000} />

              {shelterRequestErrorMessage && <p className="text-sm font-medium text-red-600">{shelterRequestErrorMessage}</p>}
              {isShelterRequestSuccess && <p className="text-sm font-medium text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100">✅ 등록 신청 완료! 관리자 승인 후 지도에 노출됩니다.</p>}

              <div className="flex justify-end gap-2 pt-4">
                <button type="button" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100" onClick={closeShelterRequestModal}>취소</button>
                <button type="submit" disabled={isSubmittingShelterRequest} className="rounded-xl bg-emerald-400 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:bg-gray-300 disabled:cursor-not-allowed">
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