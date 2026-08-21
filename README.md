# SSHS Ambassadors

서울과학고등학교 학교홍보단의 한영 전환형 웹사이트입니다. 공개 방문객은 Intro, 11개 정류장의 순환형 Tour, 익명 Survey를 이용할 수 있습니다. 로그인한 `member`는 Survey 결과와 Data Archive를 열람·업로드하고, `admin`은 Tour·Survey·Archive 콘텐츠를 관리합니다.

> 사이트 문구와 예시 기록은 개인정보를 포함하지 않습니다. 학교 소개 수치는 2025년 영문 브로슈어 기준이며 연도를 함께 표시합니다.

## 구현된 화면

- `#/intro` — 학교·학교홍보단 소개, 투어 CTA
- `#/tour` — 동일 투영 규칙의 반응형 SVG 지도, 11개 세로 스크롤 정류장, 한영 전환, 확대 보기, member 장소 설명 초안
- `#/survey` — 공개 설문 목록, 조건부 문항, 익명 제출, 로그인 사용자의 결과·분포·응답표·CSV
- `#/data` — member/admin 전용 컬렉션, 연도 필터, 기록·첨부 파일, member 업로드
- `#/login` — Supabase 이메일/비밀번호 로그인, 비밀번호 재설정, 설정 전 역할별 미리보기
- `#/admin` — admin 전용 Tour·Survey·Archive 게시 상태 및 콘텐츠 관리 UI

## 기술 구조

- 주 배포: React 19 + Vinext + Vite 기반 Work Site
- GitHub Pages: 같은 React 화면을 `static-spa/main.tsx`에서 정적 SPA로 빌드
- 라우팅: GitHub Pages의 직접 진입 404를 피하는 hash routing
- 데이터·인증·파일: 새 Supabase 프로젝트용 REST/Auth/Storage 연결 계층
- 지도: 외부 3D 라이브러리 없이 구조화된 React SVG
- 임의 HTML 저장/삽입 없음. Archive 본문은 유형이 제한된 구조화 블록 사용

추가 런타임 의존성을 넣지 않았습니다. 현재 의존성은 사이트 런타임(React/Vinext/Vite), 스타일 빌드(Tailwind import), 향후 DB migration 생성 지원(Drizzle)에 사용됩니다. 브라우저의 Supabase 호출은 작은 `fetch` 연결 계층으로 구현해 별도 SDK 번들을 추가하지 않았습니다.

## 로컬 실행

```bash
npm install
cp .env.example .env.local
npm run dev
```

Supabase를 아직 연결하지 않으면 Login 화면에 안전한 가상 member/admin 미리보기 버튼이 나타납니다. 실제 키를 넣으면 이메일/비밀번호 로그인으로 자동 전환됩니다.

정적 GitHub Pages 빌드:

```bash
npm run build:pages
```

결과는 `dist-pages/`에 생성됩니다.

## 환경 변수

| 환경 | URL | 공개 anon key | base path |
|---|---|---|---|
| Work Site | `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 불필요 |
| GitHub Pages | `VITE_SUPABASE_URL` | `VITE_SUPABASE_ANON_KEY` | `VITE_BASE_PATH` |

`service_role` 값은 프런트엔드 환경 변수, GitHub, `.env.example`에 넣지 않습니다. 익명 설문 Edge Function의 서버 환경에서만 사용합니다.

## Supabase 적용 순서

1. 새 프로젝트를 생성합니다.
2. `supabase/migrations/`의 SQL 파일을 번호순으로 실행합니다. `202608190002_tour_stop_notes.sql`이 member 장소 설명 초안과 RLS를 추가합니다.
3. 필요하면 `supabase/seed.sql`의 가상 데이터만 실행합니다.
4. `submit-survey` Edge Function을 배포합니다.
5. Auth 계정을 초대하고 `profiles.role`을 지정합니다.
6. 환경 변수를 연결합니다.
7. 공개·member·admin 역할을 각각 검증합니다.

초보자용 전체 절차는 [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)에 있습니다.

## 프로젝트 구조

```text
app/                         화면, SVG 지도, 데이터, Supabase 연결 계층
static-spa/                  GitHub Pages용 정적 진입점
public/assets/               승인된 로고
  supabase/migrations/         데이터 구조, 장소 설명 초안, 제약조건, RLS, Storage 정책
supabase/functions/          익명 설문 검증 Edge Function
supabase/seed.sql            개인정보 없는 가상 데이터
.github/workflows/deploy.yml GitHub Pages 자동 배포
docs/                        콘텐츠·지도·운영·보안·검증 문서
```

## 문서

- [사전 결정 기록](docs/PRECHECK.md)
- [디자인 조사](docs/DESIGN_RESEARCH.md)
- [콘텐츠 근거](docs/CONTENT_SOURCES.md)
- [투어 지도 명세](docs/TOUR_MAP_SPEC.md)
- [Supabase 설정](docs/SUPABASE_SETUP.md)
- [GitHub Pages 배포](docs/GITHUB_DEPLOYMENT.md)
- [관리자 사용법](docs/ADMIN_GUIDE.md)
- [보안 체크리스트](docs/SECURITY_CHECKLIST.md)
- [QA 보고서](docs/QA_REPORT.md)

## 아직 사용자가 교체할 부분

- 각 Tour 정류장의 승인된 실제 사진
- 홍보단 소개에 사용할 승인된 활동 사진
- 실제 Archive 컬렉션·기록·첨부 파일
- Supabase 프로젝트 값과 실제 member/admin 계정
- 관리 화면의 서버 데이터 CRUD 연결 최종 검증

학교 전경 사진, 브로슈어 사진, 인터넷 캠퍼스 이미지는 자동 재게시하지 않았습니다. 투어 지도는 사용자가 제공한 손그림과 확인 답변을 바탕으로 새로 제작한 개략도입니다.
