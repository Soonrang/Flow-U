// src/app/page.tsx
'use client';

import { useRouter } from "next/navigation";
import { MapPin, MessageCircle, Search, Shield, Heart, ArrowRight, ChevronDown, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: MapPin,
    title: "지도 기반 센터 찾기",
    desc: "내 주변 유기동물 봉사 센터를 지도에서 한눈에 확인하세요. 고양이·강아지·혼합 보호소를 마커로 구분합니다.",
  },
  {
    icon: MessageCircle,
    title: "게시판 & 댓글",
    desc: "각 센터의 공지사항과 봉사 후기를 확인하고, 댓글로 소통할 수 있습니다.",
  },
  {
    icon: Search,
    title: "빠른 검색",
    desc: "센터 이름이나 지역으로 원하는 보호소를 빠르게 찾아보세요.",
  },
  {
    icon: Shield,
    title: "센터 등록 & 관리",
    desc: "보호소 관리자가 직접 센터를 등록하고, 글을 게시하며 봉사자와 소통합니다.",
  },
];

const stats = [
  { value: "150+", label: "등록 보호소" },
  { value: "2,400+", label: "봉사 참여자" },
  { value: "800+", label: "입양 성공" },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden font-sans">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex h-16 items-center justify-between">
          
          {/* 💡 요청하신 기존 로고 유지 */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <PawPrint className="w-6 h-6 text-emerald-500" />
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
              FlowU
            </span>
          </div>

          <button
            onClick={() => router.push("/map")}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-400 text-white text-sm font-semibold rounded-full hover:bg-emerald-500 transition-colors shrink-0"
          >
             시작하기 ✨
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-20 sm:pt-44 sm:pb-32">
        {/* Decorative blobs */}
        <div className="absolute top-20 -left-32 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute top-40 -right-20 h-56 w-56 rounded-full bg-pink-500/10 blur-3xl" />

        <div className="container max-w-7xl mx-auto px-4 sm:px-6 relative text-center">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 text-sm text-muted-foreground shadow-sm mb-8">
            <Heart className="h-3.5 w-3.5 text-pink-500" />
            유기동물에게 따뜻한 손길을
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.15] text-foreground">
            가까운 봉사 센터를
            <br />
            <span className="text-emerald-500">지도</span>에서 찾아보세요
          </h1>

          <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            FlowU는 유기동물 봉사 센터를 한눈에 찾고,
            <br className="hidden sm:block" />
            봉사 정보를 나누는 커뮤니티 플랫폼입니다.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => router.push("/map")}
              className="rounded-full px-8 gap-2 text-base shadow-sm bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              지도 보기
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full px-8 text-base border-gray-200"
            >
              더 알아보기
            </Button>
          </div>

          {/* Marker preview */}
          <div className="mt-16 flex items-center justify-center gap-6 sm:gap-10">
            {[
              { emoji: "🐱", color: "bg-pink-100 text-pink-600 border-pink-200", label: "고양이" },
              { emoji: "🐶", color: "bg-blue-100 text-blue-600 border-blue-200", label: "강아지" },
              { emoji: "🐾", color: "bg-emerald-100 text-emerald-600 border-emerald-200", label: "혼합" },
            ].map((m) => (
              <div key={m.label} className="flex flex-col items-center gap-2">
                <div
                  className={`h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center text-2xl sm:text-3xl border-[3px] border-background shadow-sm ${m.color}`}
                >
                  {m.emoji}
                </div>
                <span className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {m.label} 보호소
                </span>
              </div>
            ))}
          </div>

          <ChevronDown className="mx-auto mt-14 h-5 w-5 text-muted-foreground/50 animate-bounce" />
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/30">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-3 gap-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-4xl font-extrabold text-emerald-500">{s.value}</p>
                <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-28">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-emerald-500 mb-2">주요 기능</p>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground">
              FlowU로 봉사를 시작하세요
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 max-w-3xl mx-auto">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border bg-card p-6 sm:p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500 mb-4 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold mb-2 text-foreground">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 sm:py-28">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6">
          <div className="relative rounded-3xl bg-emerald-50 border border-emerald-100 p-10 sm:p-16 text-center overflow-hidden">
            <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative z-10">
              <span className="text-4xl sm:text-5xl mb-4 block">🐾</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-4 text-foreground">
                지금 바로 시작하세요
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                가까운 유기동물 봉사 센터를 찾고, 작은 도움으로 큰 변화를 만들어보세요.
              </p>
              <Button
                size="lg"
                onClick={() => router.push("/map")}
                className="rounded-full px-10 gap-2 text-base shadow-sm bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                지도에서 찾기
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-white">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          {/* 💡 푸터에도 요청하신 로고 콤보 적용 */}
          <div className="flex items-center gap-2">
            <PawPrint className="w-5 h-5 text-emerald-500" />
            <span className="font-bold text-gray-900 tracking-tight">
              FlowU
            </span>
          </div>
          <p>© {new Date().getFullYear()} FlowU. 유기동물을 위한 봉사 플랫폼</p>
        </div>
      </footer>
    </div>
  );
}