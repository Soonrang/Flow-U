---
alwaysApply: false
---
# 🐾 FlowU Project Master Guide

이 문서는 FlowU (유기동물 봉사 센터 지도) 프로젝트의 아키텍처, 개발 히스토리, DB 스키마 및 코딩 표준을 정의하는 통합 가이드입니다. Cursor IDE에서 새로운 기능을 추가하거나 코드를 수정할 때 최우선으로 준수해야 하는 규칙입니다.

## 1. 프로젝트 개요 및 기술 스택

* **서비스명:** FlowU
* **목표:** 유기동물 봉사 센터 정보를 지도 위에 직관적으로 제공하여 봉사 참여를 독려하고 정보 접근성을 높임
* **핵심 가치:** 따뜻함, 친근함, 정보 전달성
* **프레임워크:** Next.js (App Router 시스템)
* **언어:** TypeScript (최적의 개발 편의성 및 안정성)
* **스타일링:** Tailwind CSS (빠른 UI 스타일링 및 일관성)
* **데이터베이스/인증:** Supabase 
* **지도 API:** 카카오맵 (`react-kakao-maps-sdk` 라이브러리 활용)
* **아이콘:** Lucide React (가벼운 모던 아이콘)
* **배포:** Vercel (GitHub 자동 배포 연동)

---

## 2. 진행 상황 및 향후 계획

### 2.1. 완료된 작업 (Current Progress)
* **초기 세팅:** 프리텐다드(Pretendard) 폰트 전역 적용 (`layout.tsx`, `globals.css`)
* **메인 페이지(`/`):** 로고 배치, '카카오 로그인' 및 '로그인 없이 이용하기' 기능 구현
* **지도 페이지(`/map`):** 박스형 레이아웃(max-width, 고정 높이, 둥근 모서리, 깊은 그림자) 적용
* **지도 기능:** `useKakaoLoader`를 통한 안전한 스크립트 로드, 검색창 및 플로팅 버튼 UI 오버레이 배치
* **커스텀 마커:** `CustomOverlayMap`을 활용하여 동물 유형별 커스텀 마커(🐱핑크, 🐶블루, 🐾그린) UI 구현 완료
* **배포 설정:** Vercel 환경 변수에 카카오 JavaScript 앱 키 (`NEXT_PUBLIC_KAKAO_APP_KEY`) 등록 및 배포 완료

### 2.2. 향후 계획 (Future Work)
1. **보호소 등록 모달 (Modal):** 우측 하단 `(+)` 버튼 클릭 시 다음 우편번호 API와 연동된 등록 신청 폼 팝업 구현
2. **마커 상호작용 (InfoWindow):** 마커 클릭 시 보호소 이름을 말풍선으로 띄우는 기능 추가
3. **Supabase DB 연결:** 임시 더미 데이터를 제거하고 DB의 `shelters` 테이블에서 실시간으로 보호소 정보 로드

---

## 3. TypeScript 코딩 스타일

### 3.1. 네이밍 규칙
* **PascalCase:** 클래스, 타입(Type), 인터페이스(Interface), Enum (`UserService`, `MapMarkerProps`)
* **camelCase:** 함수, 메서드, 변수 (`fetchUserById`, `isMapReady`)
* **ALL_CAPS:** 상수 (`DEFAULT_TIMEOUT_MS`, `MAX_RETRY_COUNT`)

### 3.2. 코드 품질 및 보안
* 하드코딩 값은 의미 있는 상수로 분리한다.
* 중복 로직은 커스텀 훅(`hooks/`) 또는 유틸 함수(`utils/`)로 추출한다.
* `any` 사용을 피하고, 필요한 경우 구체 타입을 명확히 선언한다.
* 의도를 이해하지 못했을 때에는 반드시 확인 절차를 거친다.
* 사용자 입력은 반드시 검증한다 (길이, 형식, 허용값).
* DOM 출력 전 문자열을 이스케이프/정제하여 XSS를 방지한다.
* 비밀값(API 키, 토큰)은 코드에 하드코딩하지 않고 환경변수(`.env.local`)로 관리한다.
* 관리자 페이지의 경우 반드시 Auth 검증을 거친다.

---

## 4. 데이터베이스 스키마

### 4.1. 유기동물 보호소 테이블 (`shelters`)
* `id`: BIGINT (기본키, 자동 증가)
* `name`: TEXT (보호소 명칭, Not Null)
* `address`: TEXT (전체 주소, Not Null)
* `sido`: VARCHAR(50) (광역 지자체명 - 필터링용)
* `sigungu`: VARCHAR(50) (기초 지자체명 - 필터링용)
* `latitude`: FLOAT (위도, Not Null)
* `longitude`: FLOAT (경도, Not Null)
* `phone_number`: TEXT (연락처)
* `description`: TEXT (상세 설명)
* `use_yn`: CHAR(1) (사용 여부, 기본값 'Y' - 논리적 삭제용)
* `aprv_status`: VARCHAR(20) (승인 상태, 'W': 대기, 'Y': 승인, 'R': 거절, 기본값 'W')
* `LINK_URL`: VARCHAR(200) (SNS등 외부 URL 연결 링크)
* `INTRO_INFO`: VARCHAR(500) (보호소 소개 글)
* `applicant_id`: VARCHAR(100) (신청자 ID)
* `created_at`: TIMESTAMP (생성 일시)
* `updated_at`: TIMESTAMPTZ (변경 일시)
* `applied_at`: TIMESTAMPTZ (신청 일시)

### 4.2. 게시글 및 공지사항 테이블 (`posts`)
* `id`: BIGINT (기본키)
* `shelter_id`: BIGINT (외래키, Cascade 적용)
* `title`: TEXT (제목, Not Null)
* `content`: TEXT (내용, Not Null)
* `is_notice`: BOOLEAN (공지사항 여부, 기본값 false)
* `created_at`: TIMESTAMP

### 4.3. 댓글 테이블 (`comments`)
* `id`: BIGINT (기본키)
* `post_id`: BIGINT (외래키, Cascade 적용)
* `content`: TEXT (내용, Not Null)
* `created_at`: TIMESTAMP

---

## 5. 디자인 시스템

FlowU 서비스는 둥글고 부드러운 느낌을 강조하며, 따뜻한 파스텔 톤을 일관되게 적용합니다.

### 5.1. 시각적 원칙
* **질감:** 매트 플라스틱 (Matte Plastic)
* **모서리:** 둥글게 라운딩 (`rounded-2xl`, `rounded-full` 적용)
* **쉐이딩:** 부드러운 그라데이션 및 자연스러운 그림자 (`shadow-lg`, `shadow-xl`)

### 5.2. 색상 팔레트 및 마커 테마
| 색상 구분 | 테마 컬러 | Hex Code / Tailwind | 사용 목적 |
| :--- | :--- | :--- | :--- |
| **Primary (Cat)** | Soft Pink | `#FFB7C5` (`bg-pink-100`) | 고양이 마커 배경 및 아이콘 (🐱) |
| **Primary (Dog)** | Soft Blue | `#A7C7E7` (`bg-sky-100`) | 강아지 마커 배경 및 아이콘 (🐶) |
| **Secondary (Mix)**| Emerald | `#A1D6B4` (`bg-emerald-100`)| 혼합 보호소 마커 배경 및 아이콘 (🐾) |
| **Text (Dark)** | Dark Grey | `#374151` (`text-gray-700`) | 제목 및 본문 텍스트 색상 |
| **Neutral (Med)** | Medium Grey | `#6B7280` (`text-gray-500`) | Placeholder 및 부제목 |
| **Neutral (Light)**| Light Grey | `#F3F4F6` (`bg-gray-100`) | 전체 페이지 배경 및 여백 |
| **Accent (Blue)** | Blue-500 | `#3B82F6` (`bg-blue-500`) | 실제 행동 유도 버튼 (등록, 승인 등) |

---

## 6. 핵심 비즈니스 로직

1. **지도 데이터 노출 규칙:** 사용자에게 제공되는 지도 화면에서는 반드시 `use_yn = 'Y'` 이면서 `aprv_status = 'Y'` (승인 완료)인 보호소 데이터만 마커로 표시한다.
2. **정밀 지역 검색 로직:** 주소 전체 텍스트 검색을 지양하고, `sido` 및 `sigungu` 컬럼을 활용하여 성능이 최적화된 지역 필터링을 수행한다.
3. **보호소 등록 신청 프로세스:** 일반 사용자가 보호소 등록을 신청할 경우, 데이터는 자동으로 `aprv_status = 'W'` (대기 상태)로 DB에 저장되며, 관리자가 이를 확인하고 'Y'로 업데이트하기 전까지는 일반 지도에 노출되지 않는다.