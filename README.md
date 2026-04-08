# 🐾 FlowU

> 유기동물 봉사 센터를 한눈에 찾고, 봉사 정보를 나누는 커뮤니티 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-green?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)](https://flow-u-fl86.vercel.app/)

<br/>

<img src="https://github.com/user-attachments/assets/83d29810-b8ce-4808-865a-f520292006f8">


## 📖 프로젝트 소개

**FlowU**는 전국의 유기동물 보호소와 봉사 센터를 지도 기반으로 쉽게 찾고, 봉사자와 보호소 관리자가 정보를 공유하며 소통할 수 있는 웹 플랫폼입니다.

내 주변 유기동물 봉사 센터를 실시간으로 확인하고, 동물 유형별(고양이/강아지/혼합)로 필터링하여 나에게 맞는 봉사처를 손쉽게 찾을 수 있습니다.

### 🎯 주요 목표

- 유기동물 봉사에 관심 있는 사람들에게 **접근성 높은 정보 제공**
- 보호소와 봉사자 간 **원활한 소통 채널 마련**
- 지도 기반 UX로 **직관적인 센터 탐색 경험** 제공

<br/>

## ✨ 주요 기능

### 🗺️ 지도 기반 센터 찾기

- Kakao Maps API를 활용한 실시간 보호소 위치 표시
- 동물 유형별 커스텀 마커 (🐱 고양이 / 🐶 강아지 / 🐾 혼합)
- 지도 클러스터링으로 많은 마커를 효율적으로 표시

### 📝 게시판 & 커뮤니티

- 각 센터별 공지사항 및 봉사 후기 게시판
- 댓글 기능으로 봉사자 간 정보 교류
- 보호소 관리자의 직접 글 작성 및 관리

### 🔍 빠른 검색

- 센터 이름 또는 지역으로 보호소 검색
- Daum Postcode API를 통한 정확한 주소 입력

### 🛡️ 센터 등록 & 관리

- 보호소 관리자 전용 대시보드
- 센터 정보 등록 및 수정
- 봉사자 문의 응답 관리

### 👤 사용자 프로필

- Supabase Authentication을 통한 안전한 로그인
- 닉네임 및 이메일 정보 수정

<br/>

## 🛠 기술 스택 (Tech Stack)

### Frontend

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide-React
- **UI Components**: shadcn/ui

### Backend & Database

- **BaaS**: Supabase (PostgreSQL, Authentication, Real-time)
- **ORM**: Supabase Client

### Map & Location

- **Map API**: Kakao Maps API (`react-kakao-maps-sdk`)
- **Address Search**: Daum Postcode API (`react-daum-postcode`)

### Deployment

- **Hosting**: Vercel
- **Environment**: Production (https://flow-u-fl86.vercel.app/)

<br/>

## 📂 주요 디렉토리 구조 (Directory Structure)

```text
src/
├── app/
│   ├── map/
│   │   └── page.tsx        # 메인 보호소 지도 및 등록 모달 페이지
│   ├── profile/
│   │   └── page.tsx        # 내 정보(닉네임/이메일) 수정 페이지
│   ├── admin/
│   │   └── shelters/
│   │       └── page.tsx    # 관리자용 보호소 관리 대시보드
│   └── info/
│       └── page.tsx        # 서비스 소개 랜딩 페이지
├── components/
│   ├── MapCustomMarker.tsx # 동물 유형별 카카오맵 커스텀 마커
│   └── ui/                 # shadcn/ui 컴포넌트
├── lib/
│   ├── supabase.ts         # Supabase 클라이언트 설정
│   └── animalType.ts       # 동물 유형 코드 관리
└── hooks/
    └── use-mobile.ts       # 반응형 모바일 뷰 감지 훅
```

<br/>

## 🚀 시작하기 (Getting Started)

### 사전 요구사항

- Node.js 18.x 이상
- npm 또는 yarn
- Supabase 프로젝트 (Database + Authentication)
- Kakao Developers API 키

<br/>

## 📊 데이터베이스 스키마

Supabase PostgreSQL 테이블 구조:

- **shelters**: 보호소 정보 (이름, 주소, 좌표, 동물 유형)
- **users**: 사용자 정보 (닉네임, 이메일, 인증)
- **posts**: 게시글 (센터별 공지사항 및 후기)
- **comments**: 댓글 (게시글별 댓글)

<br/>

## 🎨 주요 화면

- **랜딩 페이지** (`/info`): 서비스 소개 및 주요 기능 안내
- **지도 페이지** (`/map`): 보호소 위치 확인 및 센터 등록 모달
- **프로필 페이지** (`/profile`): 사용자 정보 수정
<br/>


<br/>

## 📧 문의

프로젝트에 대한 문의사항이 있으시면 이슈를 등록해주세요.

-----

**FlowU** - 유기동물을 위한 따뜻한 연결 🐾