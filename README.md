# SSHS Ambassadors

서울과학고 학생홍보단의 한영 전환형 웹사이트입니다. 공개 캠퍼스 투어·익명 설문, 부원 전용 자료실, 관리자 콘텐츠 관리를 제공합니다.

처음 적용하는 분은 **[START_HERE_KO.md](START_HERE_KO.md)**를 먼저 읽으세요.

## 화면과 권한

- `#/intro` — 전체 캠퍼스 지도와 투어 시작
- `#/tour` — 12개 기본 정류장, 루트 선택, 부원 설명·사진, 관리자 게시 검토
- `#/survey` — 공개 익명 설문, 로그인 사용자의 실제 결과·CSV
- `#/data` — member/admin 전용 Archive, private signed URL, 문서 업로드
- `#/login` — Supabase 로그인, 자동 session 갱신, 비밀번호 재설정 완료 화면
- `#/admin` — Tour 루트·정류장, Survey, Archive, member 설명의 Supabase CRUD

## 기술 구조

- React 19, Vite/Vinext
- GitHub Pages용 정적 hash-routed SPA
- `@supabase/supabase-js` v2 Auth/Database/Storage/Edge Functions
- PostgreSQL RLS로 public/member/admin 권한 분리
- private Archive 파일은 1시간 signed URL로만 열람

GitHub Pages에서는 서버 API를 실행할 수 없으므로, 브라우저 기능은 `/api/content`가 아니라 Supabase에 직접 연결됩니다. `service_role` key는 프런트엔드나 GitHub Pages에 넣지 않습니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Windows PowerShell에서는 두 번째 명령 대신 다음을 사용할 수 있습니다.

```powershell
Copy-Item .env.example .env.local
```

## 검증

```bash
npm run lint
npm test
npm run build:pages
```

GitHub Pages 결과는 `dist-pages/`에 생성됩니다.

## 환경 변수

| 환경 | Project URL | 공개 key | base path |
|---|---|---|---|
| Vinext/Sites | `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 없음 |
| GitHub Pages | `VITE_SUPABASE_URL` | `VITE_SUPABASE_ANON_KEY` | workflow가 저장소 이름으로 자동 설정 |

## Supabase 적용 순서

새 프로젝트에서는 아래 파일을 번호순으로 한 번씩 실행합니다.

1. `supabase/migrations/202608190001_initial_schema.sql`
2. `supabase/migrations/202608190002_tour_stop_notes.sql`
3. `supabase/migrations/202608270001_tour_note_images.sql`
4. `supabase/migrations/202608270002_complete_github_pages.sql`

기존 운영 프로젝트에 앞의 세 migration이 적용되어 있다면 네 번째 파일만 실행합니다. 오래된 `supabase/seed.sql`은 실행하지 않습니다.

익명 설문용 Function도 배포합니다.

```bash
npx supabase functions deploy submit-survey --no-verify-jwt
```

## 주요 폴더

```text
app/                         React 화면과 Supabase 연결
static-spa/                  GitHub Pages 진입점
public/assets/               로고 등 공개 asset
supabase/migrations/         DB, RLS, Storage 정책과 기본 구조
supabase/functions/          익명 설문 검증 Function
.github/workflows/deploy.yml GitHub Pages 자동 배포
docs/                        운영·보안·배포 문서
```

실제 학생 개인정보, 비밀번호, `.env.local`, Supabase secret/service-role key는 저장소에 커밋하지 않습니다.
