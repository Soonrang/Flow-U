// src/app/admin/shelters/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, MapPin, Phone, Clock, User, Building2, HourglassIcon, Search, Pencil, Trash2, Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ShelterEditForm, type ShelterForEdit } from "@/components/admin/ShelterEditForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { type AnimalTypeCode, normalizeAnimalType } from "@/lib/animalType";
import { ANIMAL_BADGE_CLASS, ANIMAL_LABEL } from "@/lib/shelterUi";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Shelter = ShelterForEdit;

type AnimalFilter = "all" | AnimalTypeCode;
type TabView = "shelters" | "pending";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
// 공통 UI 상수는 `lib/shelterUi`로 이동

const FILTER_OPTIONS: { value: AnimalFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: 1, label: "🐶 강아지" },
  { value: 2, label: "🐱 고양이" },
  { value: 3, label: "🐾 혼합" },
];

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export default function AdminSheltersPage() {
  const router = useRouter();

  const [shelters, setShelters]     = useState<Shelter[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [activeTab, setActiveTab]   = useState<TabView>("shelters");
  const [searchQuery, setSearchQuery] = useState("");
  const [animalFilter, setAnimalFilter] = useState<AnimalFilter>("all");
  const [detailShelter, setDetailShelter] = useState<Shelter | null>(null);
  const [isEditShelter, setIsEditShelter] = useState(false);
  const [isCreateShelter, setIsCreateShelter] = useState(false);
  /** 본문을 닫기 애니메이션 동안 유지하기 위해 `detailShelter`와 분리 */
  const [shelterDialogOpen, setShelterDialogOpen] = useState(false);

  const openShelterDetail = (row: Shelter) => {
    setDetailShelter(row);
    setIsEditShelter(false);
    setIsCreateShelter(false);
    setShelterDialogOpen(true);
  };

  const openShelterCreate = () => {
    setDetailShelter(null);
    setIsEditShelter(false);
    setIsCreateShelter(true);
    setShelterDialogOpen(true);
  };

  useEffect(() => { fetchShelters(); }, []);

  const fetchShelters = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("shelters")
        .select("*")
        .or("del_yn.eq.N,del_yn.is.null")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setShelters((data as Shelter[]) || []);
    } catch {
      toast.error("데이터를 불러오는데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    if (!window.confirm("보호소 신청을 승인하시겠습니까?")) return;
    try {
      const { error } = await supabase
        .from("shelters")
        .update({ aprv_status: "Y", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setShelters(prev => prev.map(s => s.id === id ? { ...s, aprv_status: "Y" } : s));
      toast.success("보호소 신청이 승인되었습니다.");
    } catch {
      toast.error("승인 처리 중 오류가 발생했습니다.");
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm("보호소 신청을 거절하시겠습니까?")) return;
    try {
      const { error } = await supabase
        .from("shelters")
        .update({ aprv_status: "R", updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      setShelters(prev => prev.map(s => s.id === id ? { ...s, aprv_status: "R" } : s));
      toast.error("보호소 신청이 거절되었습니다.");
    } catch {
      toast.error("거절 처리 중 오류가 발생했습니다.");
    }
  };

  const handleSoftDelete = async (row: Shelter) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase
        .from("shelters")
        .update({ del_yn: "Y", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (error) throw error;
      setShelters((prev) => prev.filter((s) => s.id !== row.id));
      setShelterDialogOpen(false);
      toast.success("삭제 처리되었습니다.");
    } catch {
      toast.error("삭제 처리 중 오류가 발생했습니다.");
    }
  };

  const approved = shelters.filter(s => s.aprv_status === "Y");
  const pending  = shelters.filter(s => s.aprv_status === "W");

  const filteredApproved = approved.filter(s => {
    const type = normalizeAnimalType(s.animal_type, s.id);
    const matchType = animalFilter === "all" || type === animalFilter;
    const q = searchQuery.trim();
    const matchQuery =
      !q ||
      s.name.includes(q) ||
      (s.address?.includes(q) ?? false);
    return matchType && matchQuery;
  });

  if (isLoading) {
    return (
      <div className="p-10 text-center text-sm text-gray-400">
        데이터를 불러오는 중입니다...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:space-y-6 md:p-6">

      {/* ① 페이지 헤더 */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-lg font-semibold text-gray-800">관리자 페이지</h1>
        <Button size="sm" className="ml-auto gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 max-sm:w-full" onClick={openShelterCreate}>
          <Plus className="h-4 w-4" />
          보호소 등록
        </Button>
      </div>

      {/* ② Stats 카드 (아이콘 강화) */}
      <div className="grid grid-cols-2 gap-3 md:max-w-md md:gap-4">
        <Card className="border-gray-100 shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">등록된 보호소</p>
              <p className="text-2xl font-bold text-gray-800 leading-tight">{approved.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-100 shadow-none">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <HourglassIcon className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">승인 대기</p>
              <p className="text-2xl font-bold text-emerald-600 leading-tight">{pending.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ③ 탭 (layout 사이드바가 상위 메뉴 담당, 탭은 이 페이지 내 서브뷰) */}
      <div className="border-b border-gray-200">
        <div className="flex gap-0">
          {(["shelters", "pending"] as TabView[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative px-4 pb-3 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "text-gray-900 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "shelters" ? "보호소 리스트" : (
                <span className="flex items-center gap-1.5">
                  신청 대기
                  {pending.length > 0 && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                      {pending.length}
                    </span>
                  )}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════════════════════════════
          보호소 리스트 탭
      ════════════════════════════════════ */}
      {activeTab === "shelters" && (
        <Card className="border-gray-100 shadow-none overflow-hidden">
          <CardHeader className="border-b border-gray-100 px-4 py-4 md:px-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
              <CardTitle className="text-sm font-semibold text-gray-700">
                등록된 보호소 목록
              </CardTitle>

              {/* ④ 검색 + 동물 유형 필터 */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-auto">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Input
                    placeholder="보호소명, 주소 검색"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-9 w-full border-gray-200 pl-8 text-sm focus-visible:ring-emerald-500 sm:h-8 sm:w-44"
                  />
                </div>
                <div className="flex w-full items-center gap-1 overflow-x-auto rounded-lg bg-gray-100 p-0.5 sm:w-auto">
                  {FILTER_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setAnimalFilter(opt.value)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                        animalFilter === opt.value
                          ? "bg-white text-gray-800 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="space-y-3 p-4 md:hidden">
              {filteredApproved.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-10 text-center text-sm text-gray-400">
                  {searchQuery || animalFilter !== "all" ? "검색 결과가 없습니다." : "등록된 보호소가 없습니다."}
                </div>
              ) : (
                filteredApproved.map((shelter) => {
                  const animalType = normalizeAnimalType(shelter.animal_type, shelter.id);
                  return (
                    <button
                      key={shelter.id}
                      type="button"
                      onClick={() => openShelterDetail(shelter)}
                      className="w-full rounded-2xl border border-gray-100 bg-white p-3 text-left shadow-sm transition active:scale-[0.99]"
                    >
                      <div className="flex gap-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                          {shelter.image_urls?.[0] ? (
                            <>
                              <img src={shelter.image_urls[0]} alt="" className="h-full w-full object-cover" />
                              {shelter.image_urls.length > 1 ? (
                                <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                  +{shelter.image_urls.length - 1}
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[11px] text-gray-400">
                              없음
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{shelter.name}</h3>
                            <Badge variant="outline" className={`shrink-0 text-[11px] ${ANIMAL_BADGE_CLASS[animalType]}`}>
                              {ANIMAL_LABEL[animalType]}
                            </Badge>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-gray-500">
                            {shelter.address || [shelter.sido, shelter.sigungu].filter(Boolean).join(" ") || "주소 정보 없음"}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">{shelter.phone_number || "연락처 없음"}</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[600px]">
              <TableHeader>
                <TableRow className="bg-gray-50/70 border-b border-gray-100">
                  <TableHead className="w-16 text-xs font-medium text-gray-500">이미지</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium">보호소명</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium">유형</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium hidden sm:table-cell">주소</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium hidden md:table-cell">연락처</TableHead>
                  <TableHead className="text-xs text-gray-500 font-medium hidden lg:table-cell">운영시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredApproved.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-gray-400">
                      {searchQuery || animalFilter !== "all" ? "검색 결과가 없습니다." : "등록된 보호소가 없습니다."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredApproved.map(shelter => {
                    const animalType = normalizeAnimalType(shelter.animal_type, shelter.id);
                    return (
                      <TableRow key={shelter.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                        <TableCell>
                          {shelter.image_urls?.[0] ? (
                            <button
                              type="button"
                              onClick={() => openShelterDetail(shelter)}
                              className="relative block h-11 w-11 overflow-hidden rounded-lg border border-gray-100 bg-gray-50"
                              aria-label={`${shelter.name} 이미지 보기`}
                            >
                              <img src={shelter.image_urls[0]} alt="" className="h-full w-full object-cover" />
                              {shelter.image_urls.length > 1 ? (
                                <span className="absolute bottom-0 right-0 rounded-tl bg-black/60 px-1 text-[10px] font-semibold text-white">
                                  +{shelter.image_urls.length - 1}
                                </span>
                              ) : null}
                            </button>
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-[10px] text-gray-400">
                              없음
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left text-sm font-medium text-gray-800 underline-offset-2 hover:text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                            onClick={() => openShelterDetail(shelter)}
                          >
                            {shelter.name}
                          </button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs whitespace-nowrap ${ANIMAL_BADGE_CLASS[animalType]}`}>
                            {ANIMAL_LABEL[animalType]}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-gray-500">
                          {shelter.sido} {shelter.sigungu}
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {shelter.phone_number || "-"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-gray-500">
                          {shelter.operating_hours || "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ════════════════════════════════════
          신청 대기 탭
      ════════════════════════════════════ */}
      {activeTab === "pending" && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <Card className="border-gray-100 shadow-none">
              <CardContent className="py-12 text-center text-sm text-gray-400">
                대기 중인 신청이 없습니다.
              </CardContent>
            </Card>
          ) : (
            pending.map(app => {
              const animalType = normalizeAnimalType(app.animal_type, app.id);
              const appliedDate = new Date(app.applied_at || app.created_at)
                .toLocaleDateString("ko-KR");
              return (
                <Card key={app.id} className="border-gray-100 shadow-none">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            className="text-left text-sm font-semibold text-gray-800 underline-offset-2 hover:text-emerald-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500"
                            onClick={() => openShelterDetail(app)}
                          >
                            {app.name}
                          </button>
                          <Badge variant="outline" className={`text-xs ${ANIMAL_BADGE_CLASS[animalType]}`}>
                            {ANIMAL_LABEL[animalType]}
                          </Badge>
                          <Badge variant="secondary" className="text-xs font-normal text-gray-400">
                            {appliedDate} 신청
                          </Badge>
                        </div>
                        <div className="grid gap-1.5 text-sm text-gray-500">
                          <p className="flex items-center gap-2">
                            <User className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                            {app.applicant_id}
                          </p>
                          <p className="flex items-start gap-2">
                            <MapPin className="h-3.5 w-3.5 shrink-0 text-gray-300 mt-0.5" />
                            {app.address}
                          </p>
                          <p className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                            {app.phone_number || "미기재"}
                          </p>
                          {app.operating_hours && (
                            <p className="flex items-center gap-2">
                              <Clock className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                              {app.operating_hours}
                            </p>
                          )}
                        </div>
                        {app.description && (
                          <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                            {app.description}
                          </p>
                        )}
                        {app.image_urls?.length ? (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {app.image_urls.slice(0, 5).map((url, index) => (
                              <div key={url} className="h-14 w-14 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                                <img src={url} alt={`신청 이미지 ${index + 1}`} className="h-full w-full object-cover" />
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:flex-col">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app.id)}
                          className="h-9 gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3.5 w-3.5" /> 승인
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(app.id)}
                          className="h-9 gap-1.5 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <X className="h-3.5 w-3.5" /> 거절
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <Dialog
        open={shelterDialogOpen}
        onOpenChange={setShelterDialogOpen}
        onOpenChangeComplete={(open) => {
          if (!open) {
            setDetailShelter(null);
            setIsEditShelter(false);
            setIsCreateShelter(false);
          }
        }}
      >
        <DialogContent
          className={
            isEditShelter || isCreateShelter
              ? "max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] overflow-y-auto rounded-2xl p-4 shadow-xl sm:max-h-[min(92vh,720px)] sm:max-w-lg sm:p-6 md:max-w-xl"
              : "max-h-[calc(100dvh-24px)] w-[calc(100vw-24px)] overflow-y-auto rounded-2xl p-4 shadow-xl sm:max-h-[min(90vh,640px)] sm:max-w-lg sm:p-6"
          }
        >
          {isCreateShelter ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">보호소 등록</DialogTitle>
              </DialogHeader>
              <ShelterEditForm
                mode="create"
                onSaved={() => {
                  void fetchShelters();
                  setShelterDialogOpen(false);
                  setIsCreateShelter(false);
                  toast.success("보호소가 등록되었습니다.");
                }}
                onCancel={() => setShelterDialogOpen(false)}
              />
            </>
          ) : detailShelter && isEditShelter ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg">보호소 정보 수정</DialogTitle>
              </DialogHeader>
              <ShelterEditForm
                shelter={detailShelter}
                onSaved={(updated) => {
                  if (!updated) return;
                  setShelters((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
                  setDetailShelter(updated);
                  void fetchShelters();
                  setIsEditShelter(false);
                  toast.success("저장되었습니다.");
                }}
                onCancel={() => setIsEditShelter(false)}
              />
            </>
          ) : detailShelter ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 pr-8">
                  <DialogTitle className="text-lg">{detailShelter.name}</DialogTitle>
                  <Badge
                    variant="outline"
                    className={`text-xs ${ANIMAL_BADGE_CLASS[normalizeAnimalType(detailShelter.animal_type, detailShelter.id)]}`}
                  >
                    {ANIMAL_LABEL[normalizeAnimalType(detailShelter.animal_type, detailShelter.id)]}
                  </Badge>
                  <Badge
                    variant="secondary"
                    className={`text-xs font-normal ${
                      detailShelter.use_yn === "N"
                        ? "border border-gray-200 bg-gray-100 text-gray-600"
                        : "border border-sky-200 bg-sky-50 text-sky-800"
                    }`}
                  >
                    {detailShelter.use_yn === "N" ? "미사용" : "사용 중"}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 text-sm text-gray-600">
                {detailShelter.image_urls && detailShelter.image_urls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {detailShelter.image_urls.slice(0, 5).map((url, index) => (
                      <a
                        key={url}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50"
                        aria-label={`보호소 이미지 ${index + 1} 열기`}
                      >
                        <img src={url} alt={`보호소 이미지 ${index + 1}`} className="h-full w-full object-cover" />
                      </a>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50/80 p-3">
                  <p className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                    <span>
                      <span className="font-medium text-gray-700">주소</span>
                      <br />
                      {detailShelter.address?.trim() || "—"}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">지역</span>{" "}
                    {[detailShelter.sido, detailShelter.sigungu].filter(Boolean).join(" ") || "—"}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                    <span>
                      <span className="font-medium text-gray-700">연락처</span>{" "}
                      {detailShelter.phone_number?.trim() || "—"}
                    </span>
                  </p>
                  {(detailShelter.operating_hours?.trim() ?? "") !== "" && (
                    <p className="flex items-center gap-2">
                      <Clock className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                      <span>
                        <span className="font-medium text-gray-700">운영 시간</span>{" "}
                        {detailShelter.operating_hours}
                      </span>
                    </p>
                  )}
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                    <span>
                      <span className="font-medium text-gray-700">신청자</span>{" "}
                      {detailShelter.applicant_id?.trim() || "—"}
                    </span>
                  </p>
                  {detailShelter.link_url?.trim() ? (
                    <p className="break-all text-xs">
                      <span className="font-medium text-gray-700">링크</span>{" "}
                      <a
                        href={detailShelter.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-700 underline underline-offset-2"
                      >
                        {detailShelter.link_url}
                      </a>
                    </p>
                  ) : null}
                </div>

                {detailShelter.description?.trim() ? (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      소개 · 설명
                    </p>
                    <p className="whitespace-pre-wrap rounded-xl border border-gray-100 bg-white p-3 text-sm leading-relaxed text-gray-700">
                      {detailShelter.description}
                    </p>
                  </div>
                ) : null}

                <p className="text-xs text-gray-400">
                  등록일{" "}
                  {new Date(detailShelter.created_at).toLocaleString("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  {detailShelter.applied_at ? (
                    <>
                      {" "}
                      · 신청일{" "}
                      {new Date(detailShelter.applied_at).toLocaleString("ko-KR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </>
                  ) : null}
                </p>

                <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                    onClick={() => setIsEditShelter(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    수정
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={() => void handleSoftDelete(detailShelter)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    삭제
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
