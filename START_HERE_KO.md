# SSHS Ambassadors 완성본 적용 가이드

이 파일부터 읽으면 됩니다. 대상 저장소 이름은 `sshs-ambassadors-site`, 기본 배포 주소는 아래와 같습니다.

```text
https://sshsabassadors-coder.github.io/sshs-ambassadors-site/
```

이번 완성본은 다음 문제를 코드에서 수정했습니다.

- 로그인 후 투어 설명·사진을 저장할 때 `Sign in is required.`가 뜨던 문제
- access token만 임시 저장해 시간이 지나면 로그인이 풀리던 문제
- GitHub Pages에서 실행할 수 없는 `/api/content`에 Tour·Archive가 의존하던 문제
- 정적 예시 ID 때문에 익명 설문 제출이 거절되던 문제
- Data Archive의 비공개 파일 URL, 업로드 DB 기록, 관리자 CRUD가 이어지지 않던 문제
- 비밀번호 재설정 메일 뒤 새 비밀번호를 입력할 화면이 없던 문제
- Admin의 Tour 루트·장소, Survey, Archive 변경 사항이 새로고침 뒤 사라지던 문제

화면 디자인과 기존 12개 정류장 지도는 유지했습니다.

## 1. 준비 프로그램

Windows에 다음 프로그램이 있어야 합니다.

1. Node.js 22 이상: <https://nodejs.org/>
2. Git: <https://git-scm.com/download/win>
3. VS Code: <https://code.visualstudio.com/>

PowerShell에서 확인합니다.

```powershell
node -v
npm -v
git --version
```

`node -v`가 `v22` 이상이면 됩니다.

## 2. 기존 파일 백업

1. 현재 `sshs-ambassadors-site` 폴더를 통째로 복사합니다.
2. 복사본 이름을 `sshs-ambassadors-site-backup`처럼 바꿉니다.
3. 현재 프로젝트의 `.env.local`이 있다면 따로 보관합니다. 이 파일에는 Supabase 값이 있으므로 다른 사람에게 보내거나 GitHub에 올리지 않습니다.

## 3. 완성본 파일 넣기

1. 받은 완성본 ZIP의 압축을 풉니다.
2. 압축을 푼 폴더 안의 파일과 폴더를 현재 Git 저장소 폴더에 복사하고, 같은 이름의 파일은 덮어씁니다.
3. 현재 저장소 안의 `.git` 폴더는 지우지 않습니다.
4. 기존 `.env.local`은 그대로 유지합니다.

특히 아래 파일이 새 버전으로 들어갔는지 확인합니다.

```text
app/AmbassadorsApp.tsx
app/PortalPages.tsx
app/contentApi.ts
app/supabase.ts
package.json
package-lock.json
supabase/migrations/202608270002_complete_github_pages.sql
```

## 4. 로컬 설치와 코드 검증

VS Code에서 현재 저장소 폴더를 열고 `Terminal → New Terminal`을 누릅니다.

```powershell
npm ci
npm run lint
npm test
npm run build:pages
```

정상 결과는 다음과 같습니다.

- `npm run lint`: 오류 0개. 일반 `<img>` 최적화 경고만 나올 수 있습니다.
- `npm test`: 테스트 1개 통과
- `npm run build:pages`: `built`와 함께 성공

## 5. Supabase SQL 적용

### 이미 사용 중인 현재 Supabase 프로젝트라면

기존 세 개 migration은 이미 적용되어 있으므로 아래 파일 하나만 실행합니다.

```text
supabase/migrations/202608270002_complete_github_pages.sql
```

방법:

1. Supabase Dashboard에 로그인합니다.
2. 현재 사이트가 사용하는 프로젝트를 엽니다.
3. 왼쪽 `SQL Editor`를 누릅니다.
4. `New query`를 누릅니다.
5. 위 SQL 파일을 VS Code에서 열고 전체 선택한 뒤 복사합니다.
6. SQL Editor에 붙여넣고 `Run`을 한 번 누릅니다.
7. `Success. No rows returned`가 나오면 정상입니다.

이 SQL은 다음을 추가하거나 보완합니다.

- 실제 Tour 루트와 루트별 정류장
- 투어 설명의 `route_id`
- Admin이 수정하는 Tour 데이터의 RLS
- 세 개의 실제 UUID 설문과 문항
- 세 개의 Archive 컬렉션

### 완전히 새 Supabase 프로젝트라면

다음 네 파일을 번호순으로 각각 새 Query에서 한 번씩 실행합니다.

1. `202608190001_initial_schema.sql`
2. `202608190002_tour_stop_notes.sql`
3. `202608270001_tour_note_images.sql`
4. `202608270002_complete_github_pages.sql`

`supabase/seed.sql`은 과거 11개 정류장용 데이터가 포함되어 있으므로 실행하지 않습니다.

## 6. SQL 결과 확인

Supabase의 `Table Editor`에서 다음을 확인합니다.

- `tour_routes`: `Tour 1` 한 줄
- `tour_route_stops`: 12줄
- `surveys`: 3줄
- `survey_questions`: 15줄
- `archive_collections`: 3줄

`Storage`에서는 다음 두 bucket을 확인합니다.

- `tour-images`: Public, 사진 10MB 제한
- `archive-files`: Private, 문서 25MB 제한

## 7. 비밀번호 재설정 주소 등록

Supabase에서 `Authentication → URL Configuration`을 엽니다.

`Site URL`:

```text
https://sshsabassadors-coder.github.io/sshs-ambassadors-site/
```

`Redirect URLs`에 다음을 추가합니다.

```text
https://sshsabassadors-coder.github.io/sshs-ambassadors-site/**
http://localhost:3000/**
http://localhost:5173/**
```

저장합니다. 저장소 이름이나 GitHub 아이디가 다르면 실제 주소로 바꿉니다.

## 8. 설문 Edge Function 배포

익명 설문 제출은 Supabase Edge Function이 검증합니다. 프로젝트 폴더의 PowerShell에서 실행합니다.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy submit-survey --no-verify-jwt
npx supabase secrets set ALLOWED_ORIGINS="https://sshsabassadors-coder.github.io,http://localhost:3000,http://localhost:5173"
```

`YOUR_PROJECT_REF`는 Supabase Project URL의 첫 부분입니다. 예를 들어 URL이 `https://abcdefgh.supabase.co`이면 project ref는 `abcdefgh`입니다.

`SUPABASE_SERVICE_ROLE_KEY`를 코드, `.env.local`, GitHub Secret에 직접 넣지 않습니다. Edge Function에는 Supabase가 서버 전용 값으로 제공합니다.

## 9. GitHub 설정 확인

GitHub 저장소에서 `Settings → Secrets and variables → Actions`를 엽니다.

`Variables` 탭:

```text
VITE_SUPABASE_URL = https://YOUR_PROJECT_REF.supabase.co
```

`Secrets` 탭:

```text
VITE_SUPABASE_ANON_KEY = Supabase의 publishable 또는 anon key
```

이름의 철자와 대소문자가 정확해야 합니다. `service_role` key는 넣지 않습니다.

`Settings → Pages → Build and deployment → Source`는 `GitHub Actions`로 선택합니다.

## 10. GitHub에 수정본 올리기

먼저 상태를 확인합니다.

```powershell
git status
```

`.env.local`, `node_modules`, `dist`, `dist-pages`가 업로드 목록에 들어가면 멈춥니다. 정상이라면 실행합니다.

```powershell
git add .
git status
git commit -m "Fix Supabase auth and complete site persistence"
git push origin main
```

GitHub의 `Actions` 탭에서 `Deploy to GitHub Pages`가 녹색 체크가 될 때까지 기다립니다. 그 뒤 사이트를 열고 `Ctrl + F5`로 새로고침합니다.

## 11. member와 admin 계정 확인

Supabase `Authentication → Users`에서 계정을 만들거나 초대합니다. 새 계정은 기본적으로 `member`입니다.

첫 관리자 지정은 SQL Editor에서 실행합니다.

```sql
update public.profiles
set role = 'admin'
where email = '관리자이메일@example.com';
```

확인:

```sql
select email, role
from public.profiles
order by created_at;
```

## 12. 배포 후 반드시 할 실제 테스트

### 설명·사진 오류 재검증

1. 사이트에서 member 또는 admin으로 로그인합니다.
2. `Tour → 대회의실 → + 설명 추가`를 누릅니다.
3. 먼저 사진 없이 한국어 설명만 저장합니다.
4. 다시 PNG 또는 JPG 한 장과 설명을 저장합니다.
5. `Sign in is required.`가 뜨지 않고 저장되는지 확인합니다.
6. 페이지를 새로고침해도 설명과 사진이 남는지 확인합니다.

member가 쓴 글은 안전을 위해 처음에는 `DRAFT`입니다. admin으로 로그인한 뒤 `Admin → Tour 1 → MEMBER NOTES → Publish`를 누르면 로그아웃한 방문객에게도 보입니다. admin이 직접 작성한 글은 바로 게시됩니다.

### 나머지 기능

- 로그아웃: Intro, Tour, 게시 설문만 열림
- member: Data Archive 열람·문서 업로드 가능, Admin 메뉴는 숨김
- admin: Tour 루트/정류장, 설문, Archive 생성·수정·삭제 가능
- Survey: 로그아웃 상태에서 제출 가능, 로그인 후 Result와 CSV 확인 가능
- 비밀번호 재설정: 메일 링크를 누르면 새 비밀번호 입력 화면이 열림
- Archive 문서: 주소를 복사해 로그아웃 브라우저에서 열면 접근되지 않음

## 문제가 생기면 확인할 순서

1. GitHub `Actions` 빌드가 녹색인지 확인합니다.
2. 브라우저에서 `Ctrl + F5`를 누릅니다.
3. Supabase SQL의 네 번째 migration이 성공했는지 확인합니다.
4. GitHub Variable/Secret 이름을 확인합니다.
5. Supabase `Authentication → URL Configuration` 주소를 확인합니다.
6. 브라우저 개발자 도구의 `Network`에서 빨간 요청의 상태 코드를 확인합니다.

`401`은 로그인/session 문제, `403`은 계정 role 또는 RLS 문제, `404`는 migration/Edge Function/경로 문제일 가능성이 큽니다.
