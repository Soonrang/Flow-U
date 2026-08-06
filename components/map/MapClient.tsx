'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Map, CustomOverlayMap, useKakaoLoader } from 'react-kakao-maps-sdk';
import { useDaumPostcodePopup } from 'react-daum-postcode';
import Image from 'next/image';
import { AlertCircle, ArrowLeft, Clock, Copy, ExternalLink, LocateFixed, LogOut, MapPin, Navigation, Phone, Plus, Search, User, X } from 'lucide-react';

import MapCustomMarker from '@/components/MapCustomMarker';
import MobileMapBottomSheet, { type SheetState, type ShelterListItem } from '@/components/map/MobileMapBottomSheet';
import { ANIMAL_TYPE_DOG, normalizeAnimalType, type AnimalTypeCode } from '@/lib/animalType';
import { supabase } from '@/lib/supabase';
import { ANIMAL_BADGE_CLASS, ANIMAL_LABEL, PHONE_NUMBER_REGEX } from '@/lib/shelterUi';

const AVATAR_PATHS = Array.from({ length: 10 }, (_, i) => `/avatars/avatar-${i + 1}.PNG`);
const DEFAULT_CENTER = { lat: 37.5326, lng: 127.0246 };
const GEOLOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 };

type ShelterRow = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  animal_type: number | string | null;
  address: string | null;
  phone_number: string | null;
  operating_hours: string | null;
  description: string | null;
};

type ShelterRequestForm = {
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
};

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
  animalType: ANIMAL_TYPE_DOG,
};

const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export default function MapClient() {
  const router = useRouter();
  const openPostcodePopup = useDaumPostcodePopup();
  const mobileMapRef = useRef<kakao.maps.Map | null>(null);
  const desktopMapRef = useRef<kakao.maps.Map | null>(null);

  const [user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [avatarIndex, setAvatarIndex] = useState<number | null>(null);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState('');
  const [sheetState, setSheetState] = useState<SheetState>('closed');
  const [shelters, setShelters] = useState<ShelterListItem[]>([]);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [isLocating, setIsLocating] = useState(false);
  const [locationErrorMessage, setLocationErrorMessage] = useState('');
  const [selectedShelterId, setSelectedShelterId] = useState<number | null>(null);
  const [copiedShelterId, setCopiedShelterId] = useState<number | null>(null);

  const [isShelterRequestModalOpen, setIsShelterRequestModalOpen] = useState(false);
  const [shelterRequestForm, setShelterRequestForm] = useState<ShelterRequestForm>(INITIAL_SHELTER_REQUEST_FORM);
  const [isSubmittingShelterRequest, setIsSubmittingShelterRequest] = useState(false);
  const [shelterRequestErrorMessage, setShelterRequestErrorMessage] = useState('');
  const [isShelterRequestSuccess, setIsShelterRequestSuccess] = useState(false);
  const [isLatLngEditable, setIsLatLngEditable] = useState(false);

  const [loading, error] = useKakaoLoader({
    appkey: process.env.NEXT_PUBLIC_KAKAO_APP_KEY as string,
    libraries: ['services'],
  });

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase.from('users').select('nickname, avatar_index').eq('id', userId).single();
      if (data) {
        setNickname(data.nickname || '');
        setAvatarIndex(data.avatar_index ?? null);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) void fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) void fetchProfile(session.user.id);
      else {
        setNickname('');
        setAvatarIndex(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchShelters = async () => {
      const { data, error: queryError } = await supabase
        .from('shelters')
        .select('id, name, latitude, longitude, animal_type, address, phone_number, operating_hours, description')
        .eq('use_yn', 'Y')
        .eq('aprv_status', 'Y')
        .or('del_yn.eq.N,del_yn.is.null')
        .order('created_at', { ascending: false });

      if (queryError) return;

      const mapped = ((data ?? []) as ShelterRow[])
        .filter((row) => Number.isFinite(row.latitude) && Number.isFinite(row.longitude))
        .map((row) => ({
          id: row.id,
          name: row.name,
          lat: row.latitude,
          lng: row.longitude,
          type: normalizeAnimalType(row.animal_type, row.id),
          address: row.address ?? '',
          phone: row.phone_number ?? '',
          hours: row.operating_hours ?? '',
          description: row.description ?? '',
          distanceKm: 0,
        }));

      setShelters(mapped);
    };
    void fetchShelters();
  }, []);

  const moveMapToPosition = useCallback((position: { lat: number; lng: number }) => {
    setMapCenter(position);

    if (typeof window === 'undefined' || !window.kakao?.maps) return;

    const nextCenter = new window.kakao.maps.LatLng(position.lat, position.lng);
    mobileMapRef.current?.panTo(nextCenter);
    desktopMapRef.current?.panTo(nextCenter);
  }, []);

  const getLocationErrorMessage = (positionError?: GeolocationPositionError) => {
    if (!navigator.geolocation) return '이 브라우저에서는 현재 위치를 사용할 수 없습니다.';
    if (positionError?.code === 1) return '브라우저에서 위치 권한을 허용해 주세요.';
    if (positionError?.code === 3) return '현재 위치를 가져오는 데 시간이 오래 걸리고 있습니다. 다시 시도해 주세요.';
    return '현재 위치를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.';
  };

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        moveMapToPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => undefined,
      GEOLOCATION_OPTIONS,
    );
  }, [moveMapToPosition]);

  const listByCenter = useMemo(
    () =>
      shelters
        .filter((s) => !searchKeyword || s.name.includes(searchKeyword) || s.address.includes(searchKeyword))
        .map((s) => ({ ...s, distanceKm: getDistanceFromLatLonInKm(mapCenter.lat, mapCenter.lng, s.lat, s.lng) }))
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [mapCenter.lat, mapCenter.lng, searchKeyword, shelters],
  );

  const selectedShelter = useMemo(
    () => listByCenter.find((shelter) => shelter.id === selectedShelterId) ?? null,
    [listByCenter, selectedShelterId],
  );
  const selectedShelterKakaoSearchUrl = selectedShelter
    ? `https://map.kakao.com/link/search/${encodeURIComponent(`${selectedShelter.name} ${selectedShelter.address}`.trim())}`
    : '';
  const selectedShelterKakaoRouteUrl = selectedShelter
    ? `https://map.kakao.com/link/to/${encodeURIComponent(selectedShelter.name)},${selectedShelter.lat},${selectedShelter.lng}`
    : '';

  const handleLocateMe = () => {
    if (isLocating) return;
    if (!navigator.geolocation) {
      setLocationErrorMessage(getLocationErrorMessage());
      return;
    }

    setIsLocating(true);
    setLocationErrorMessage('');
    navigator.geolocation.getCurrentPosition(
      (p) => {
        moveMapToPosition({ lat: p.coords.latitude, lng: p.coords.longitude });
        setSheetState('closed');
        setIsLocating(false);
      },
      (positionError) => {
        setLocationErrorMessage(getLocationErrorMessage(positionError));
        setIsLocating(false);
      },
      GEOLOCATION_OPTIONS,
    );
  };

  const handleRegisterClick = () => {
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    setShelterRequestForm((prev) => ({ ...INITIAL_SHELTER_REQUEST_FORM, applicantId: nickname || prev.applicantId }));
    setIsShelterRequestModalOpen(true);
  };

  const handleMoveToShelter = (shelterId: number) => {
    const targetShelter = listByCenter.find((shelter) => shelter.id === shelterId);

    setSelectedShelterId(shelterId);
    setSheetState((current) => (current === 'closed' ? 'half' : current));

    if (targetShelter && window.matchMedia('(min-width: 768px)').matches) {
      moveMapToPosition({ lat: targetShelter.lat, lng: targetShelter.lng });
    }
  };

  const handleBackToShelterList = () => {
    setSelectedShelterId(null);
  };

  const handleCopyAddress = async (shelter: ShelterListItem) => {
    if (!shelter.address.trim() || !navigator.clipboard) return;

    await navigator.clipboard.writeText(shelter.address);
    setCopiedShelterId(shelter.id);
    window.setTimeout(() => setCopiedShelterId((current) => (current === shelter.id ? null : current)), 1600);
  };

  const handleKakaoLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/map` },
    });
  };

  const handleShelterRequestInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'animalType') setShelterRequestForm((p) => ({ ...p, animalType: Number(value) as AnimalTypeCode }));
    else if (name !== 'applicantId') setShelterRequestForm((p) => ({ ...p, [name]: value }));
  };

  const handleCompletePostcode = (data: any) => {
    setShelterRequestForm((p) => ({ ...p, address: data.address, sido: data.sido ?? '', sigungu: data.sigungu ?? '' }));
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
    if (!shelterRequestForm.name.trim() || !shelterRequestForm.address.trim()) {
      setShelterRequestErrorMessage('필수 항목을 입력해 주세요.');
      return;
    }
    if (shelterRequestForm.phoneNumber.trim() && !PHONE_NUMBER_REGEX.test(shelterRequestForm.phoneNumber.trim())) {
      setShelterRequestErrorMessage('전화번호 형식이 올바르지 않습니다.');
      return;
    }

    setIsSubmittingShelterRequest(true);
    setShelterRequestErrorMessage('');
    try {
      const payload = {
        name: shelterRequestForm.name.trim(),
        address: `${shelterRequestForm.address} ${shelterRequestForm.addressDetail}`.trim(),
        sido: shelterRequestForm.sido || null,
        sigungu: shelterRequestForm.sigungu || null,
        latitude: Number(shelterRequestForm.latitude),
        longitude: Number(shelterRequestForm.longitude),
        phone_number: shelterRequestForm.phoneNumber.trim() || null,
        description: shelterRequestForm.description.trim() || null,
        link_url: shelterRequestForm.linkUrl.trim() || null,
        applicant_id: nickname.trim(),
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
      setShelterRequestErrorMessage('등록 신청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmittingShelterRequest(false);
    }
  };

  if (loading) return <div className="flex h-[100dvh] items-center justify-center">Loading map...</div>;
  if (error) return <div className="flex h-[100dvh] items-center justify-center text-red-500">Failed to load map.</div>;

  return (
    <>
      <div className="flex h-[100dvh] flex-col overflow-hidden bg-white md:hidden">
        <header className="z-40 flex h-16 shrink-0 items-center justify-between border-b bg-white/95 px-4 backdrop-blur">
          <h1 className="text-xl font-bold text-emerald-600">FlowU</h1>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRegisterClick} className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" />등록</button>
            {user ? (
              <div className="relative">
                <button onClick={() => setIsProfileMenuOpen((p) => !p)} className="h-9 w-9 overflow-hidden rounded-full border bg-slate-100" aria-label="프로필 메뉴">
                  {avatarIndex !== null ? <Image src={AVATAR_PATHS[avatarIndex - 1]} alt="프로필" width={36} height={36} className="h-full w-full object-cover" /> : <User className="m-auto h-4 w-4 text-slate-500" />}
                </button>
                {isProfileMenuOpen ? (
                  <div className="absolute right-0 top-11 z-50 w-44 rounded-xl border bg-white p-1 shadow-lg">
                    <button onClick={() => { setIsProfileMenuOpen(false); router.push('/profile'); }} className="w-full rounded px-3 py-2 text-left text-sm hover:bg-slate-50">내 프로필</button>
                    <button onClick={async () => { setIsProfileMenuOpen(false); await supabase.auth.signOut(); }} className="w-full rounded px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50">로그아웃</button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </header>

        <main className="relative flex-1 overflow-hidden">
          <div className="absolute inset-0">
            <Map center={mapCenter} style={{ width: '100%', height: '100%' }} level={5} onCreate={(map) => { mobileMapRef.current = map; }} onCenterChanged={(map) => { const c = map.getCenter(); setMapCenter({ lat: c.getLat(), lng: c.getLng() }); }}>
              {listByCenter.map((s) => {
                const isSelected = selectedShelterId === s.id;

                return (
                  <CustomOverlayMap key={s.id} position={{ lat: s.lat, lng: s.lng }} yAnchor={1} zIndex={isSelected ? 10 : 1}>
                    <button
                      type="button"
                      onClick={() => handleMoveToShelter(s.id)}
                      aria-pressed={isSelected}
                      className="cursor-pointer"
                    >
                      <MapCustomMarker type={s.type} selected={isSelected} />
                    </button>
                  </CustomOverlayMap>
                );
              })}
            </Map>
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 px-4">
            <div className="pointer-events-auto relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={searchKeyword} onChange={(e) => setSearchKeyword(e.target.value)} placeholder="센터 이름 또는 지역 검색" className="h-12 w-full rounded-2xl border bg-white px-11 pr-4 text-sm shadow-lg outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100" />
              <button type="button" onClick={handleLocateMe} disabled={isLocating} className="absolute -bottom-12 right-0 inline-flex h-11 w-11 items-center justify-center rounded-full border bg-white shadow-lg" aria-label="내 위치로 이동"><LocateFixed className="h-5 w-5 text-emerald-600" /></button>
              {locationErrorMessage ? (
                <p className="absolute right-0 top-[6.5rem] max-w-64 rounded-xl border border-red-100 bg-white px-3 py-2 text-xs font-medium text-red-600 shadow-lg">
                  {locationErrorMessage}
                </p>
              ) : null}
            </div>
          </div>
          {sheetState === 'closed' ? <div className="absolute inset-x-0 bottom-6 z-20 flex justify-center"><button type="button" onClick={() => setSheetState('half')} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-xl">목록보기 ({listByCenter.length})</button></div> : null}
          <MobileMapBottomSheet
            shelters={listByCenter}
            selectedShelter={selectedShelter}
            sheetState={sheetState}
            onBackToList={handleBackToShelterList}
            onSheetStateChange={setSheetState}
            onSelectShelter={handleMoveToShelter}
          />
        </main>
      </div>

      <div className="hidden h-[100dvh] overflow-hidden bg-slate-100 md:flex">
        <aside className="flex h-full w-[420px] shrink-0 flex-col border-r border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h1 className="text-2xl font-bold text-emerald-600">FlowU</h1>
            <button
              type="button"
              onClick={handleRegisterClick}
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              등록
            </button>
          </div>

          <div className="space-y-3 border-b border-slate-200 px-5 py-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="센터 이름 또는 지역 검색"
                className="h-11 w-full rounded-xl border border-slate-200 bg-white px-10 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              <LocateFixed className="h-4 w-4 text-emerald-600" />
              {isLocating ? '위치 확인 중' : '내 위치로 이동'}
            </button>
            {locationErrorMessage ? (
              <p className="text-xs font-medium text-red-600">{locationErrorMessage}</p>
            ) : null}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {selectedShelter ? (
              <div className="-m-4 min-h-full bg-white">
                <div className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-slate-200 bg-white px-3">
                  <button
                    type="button"
                    onClick={handleBackToShelterList}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    목록
                  </button>
                  <span className="text-xs font-medium text-slate-400">상세정보</span>
                </div>

                <div className="space-y-5 px-5 py-5">
                  <div className="space-y-3 border-b border-slate-100 pb-5">
                    <h2 className="line-clamp-2 text-2xl font-bold leading-8 text-slate-950">{selectedShelter.name}</h2>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${ANIMAL_BADGE_CLASS[selectedShelter.type]}`}
                    >
                      {ANIMAL_LABEL[selectedShelter.type]}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <a
                      href={selectedShelter.phone ? `tel:${selectedShelter.phone}` : undefined}
                      aria-disabled={!selectedShelter.phone}
                      className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-3 text-xs font-semibold ${
                        selectedShelter.phone
                          ? 'border-slate-200 text-slate-700 hover:bg-emerald-50'
                          : 'pointer-events-none border-slate-100 text-slate-300'
                      }`}
                    >
                      <Phone className="h-4 w-4 text-emerald-600" />
                      전화
                    </a>
                    <button
                      type="button"
                      onClick={() => handleCopyAddress(selectedShelter)}
                      disabled={!selectedShelter.address.trim()}
                      className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 px-2 py-3 text-xs font-semibold text-slate-700 hover:bg-emerald-50 disabled:pointer-events-none disabled:border-slate-100 disabled:text-slate-300"
                    >
                      <Copy className="h-4 w-4 text-emerald-600" />
                      {copiedShelterId === selectedShelter.id ? '복사됨' : '주소복사'}
                    </button>
                    <a
                      href={selectedShelterKakaoSearchUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 px-2 py-3 text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                    >
                      <ExternalLink className="h-4 w-4 text-emerald-600" />
                      카카오맵
                    </a>
                    <a
                      href={selectedShelterKakaoRouteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 px-2 py-3 text-xs font-semibold text-slate-700 hover:bg-emerald-50"
                    >
                      <Navigation className="h-4 w-4 text-emerald-600" />
                      길찾기
                    </a>
                  </div>

                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
                    <p className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                      <span>{selectedShelter.address || '주소 정보 없음'}</span>
                    </p>
                    <p className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700">
                      <Phone className="h-4 w-4 shrink-0 text-emerald-500" />
                      {selectedShelter.phone || '-'}
                    </p>
                    <p className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700">
                      <Clock className="h-4 w-4 shrink-0 text-emerald-500" />
                      {selectedShelter.hours || '운영시간 정보 없음'}
                    </p>
                  </div>

                  {selectedShelter.description.trim() ? (
                    <section className="space-y-2">
                      <h3 className="text-sm font-bold text-slate-900">소개</h3>
                      <p className="whitespace-pre-wrap rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                        {selectedShelter.description}
                      </p>
                    </section>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {listByCenter.map((shelter) => (
                  <button
                    key={shelter.id}
                    type="button"
                    onClick={() => handleMoveToShelter(shelter.id)}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="line-clamp-2 text-sm font-bold text-slate-900">{shelter.name}</h3>
                        <p className="mt-1 text-xs font-semibold text-emerald-600">
                          중심에서 약 {shelter.distanceKm.toFixed(1)}km
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${ANIMAL_BADGE_CLASS[shelter.type]}`}
                      >
                        {ANIMAL_LABEL[shelter.type]}
                      </span>
                    </div>
                    <p className="flex items-start gap-2 text-xs text-slate-600">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="line-clamp-1">{shelter.address || '주소 정보 없음'}</span>
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="relative h-full flex-1">
          <Map
            center={mapCenter}
            style={{ width: '100%', height: '100%' }}
            level={5}
            onCreate={(map) => {
              desktopMapRef.current = map;
            }}
            onCenterChanged={(map) => {
              const center = map.getCenter();
              setMapCenter({ lat: center.getLat(), lng: center.getLng() });
            }}
          >
            {listByCenter.map((s) => {
              const isSelected = selectedShelterId === s.id;

              return (
                <CustomOverlayMap key={`desktop-${s.id}`} position={{ lat: s.lat, lng: s.lng }} yAnchor={1} zIndex={isSelected ? 10 : 1}>
                  <button
                    type="button"
                    onClick={() => handleMoveToShelter(s.id)}
                    aria-pressed={isSelected}
                    className="cursor-pointer"
                  >
                    <MapCustomMarker type={s.type} selected={isSelected} />
                  </button>
                </CustomOverlayMap>
              );
            })}
          </Map>
        </section>
      </div>

      {isLoginModalOpen ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-red-50"><AlertCircle className="h-7 w-7 text-red-500" /></div>
            <h2 className="mb-2 text-xl font-bold">로그인이 필요합니다</h2>
            <p className="mb-8 text-sm text-gray-500">로그인 후 센터 등록 신청이 가능합니다.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleKakaoLogin} className="w-full rounded-xl bg-[#FEE500] px-4 py-3.5 text-sm font-bold text-black/85">카카오 로그인 하기</button>
              <button onClick={() => setIsLoginModalOpen(false)} className="w-full rounded-xl bg-gray-100 px-4 py-3.5 text-sm font-semibold text-gray-600">닫기</button>
            </div>
          </div>
        </div>
      ) : null}

      {isShelterRequestModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-5 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-gray-900">보호소 등록 신청</h2>
                <p className="mt-2 text-sm text-gray-500">관리자 승인 후 지도에 노출됩니다.</p>
              </div>
              <button type="button" onClick={closeShelterRequestModal} className="shrink-0 rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors" aria-label="닫기"><X className="h-5 w-5" /></button>
            </div>
            <form className="mt-6 space-y-4" onSubmit={handleShelterRequestSubmit}>
              <div><label className="mb-1 block text-xs font-semibold text-gray-500">신청자 (닉네임)</label><input type="text" name="applicantId" value={shelterRequestForm.applicantId} readOnly className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm text-gray-700 outline-none" placeholder="로그인 닉네임이 자동 입력됩니다" required /></div>
              <input type="text" name="name" value={shelterRequestForm.name} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="보호소 이름 *" maxLength={120} required />
              <div><select name="animalType" value={String(shelterRequestForm.animalType)} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900 text-gray-600" required><option value="1">강아지</option><option value="2">고양이</option><option value="3">기타</option></select></div>
              <div className="space-y-2"><div className="flex gap-2"><input type="text" name="address" value={shelterRequestForm.address} className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-sm outline-none cursor-not-allowed" placeholder="주소 *" readOnly required /><button type="button" className="shrink-0 rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500" onClick={() => openPostcodePopup({ onComplete: handleCompletePostcode })}>주소 검색</button></div><input type="text" name="addressDetail" value={shelterRequestForm.addressDetail} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="상세 주소" maxLength={100} /></div>
              <div className="rounded-xl bg-gray-50 p-4 border border-gray-200"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-semibold text-gray-500">자동 변환된 좌표</span><label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer"><input type="checkbox" checked={isLatLngEditable} onChange={(e) => setIsLatLngEditable(e.target.checked)} className="rounded text-gray-900 focus:ring-gray-900 cursor-pointer" /><span>직접 수정하기</span></label></div><div className="grid grid-cols-2 gap-3"><input type="number" name="latitude" value={shelterRequestForm.latitude} onChange={handleShelterRequestInputChange} className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 ${!isLatLngEditable ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`} placeholder="위도" step="any" readOnly={!isLatLngEditable} required /><input type="number" name="longitude" value={shelterRequestForm.longitude} onChange={handleShelterRequestInputChange} className={`w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 ${!isLatLngEditable ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'bg-white'}`} placeholder="경도" step="any" readOnly={!isLatLngEditable} required /></div></div>
              <input type="text" name="phoneNumber" value={shelterRequestForm.phoneNumber} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="연락처 (선택)" maxLength={20} />
              <input type="url" name="linkUrl" value={shelterRequestForm.linkUrl} onChange={handleShelterRequestInputChange} className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-gray-900" placeholder="관련 링크 URL (선택)" />
              <textarea name="description" value={shelterRequestForm.description} onChange={handleShelterRequestInputChange} className="h-24 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-gray-900" placeholder="상세 설명 (선택)" maxLength={1000} />
              {shelterRequestErrorMessage ? <p className="text-sm font-medium text-red-600">{shelterRequestErrorMessage}</p> : null}
              {isShelterRequestSuccess ? <p className="text-sm font-medium text-emerald-600 bg-emerald-50 p-4 rounded-xl border border-emerald-100">✅ 등록 신청 완료! 관리자 승인 후 지도에 노출됩니다.</p> : null}
              <div className="flex justify-end gap-2 pt-4"><button type="button" className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100" onClick={closeShelterRequestModal}>취소</button><button type="submit" disabled={isSubmittingShelterRequest} className="rounded-xl bg-emerald-400 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:bg-gray-300 disabled:cursor-not-allowed">{isSubmittingShelterRequest ? '신청 중...' : '등록 신청하기'}</button></div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

