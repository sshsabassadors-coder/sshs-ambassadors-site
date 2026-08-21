# SSHS Ambassadors: Supabase · GitHub 연결 가이드

이 폴더는 2026-08-19에 배포된 SSHS Ambassadors 사이트의 소스 스냅샷입니다.

- 화면 기준: 12개 투어 지점, 최신 캠퍼스 개략도, 멤버 설명, 여러 사진 첨부 UI, Survey, Data Archive, Admin Studio
- 소스 커밋: `be3a6e22614507111487939f5f2409b7478fc273`
- 기존 배포 주소: `https://sshs-ambassadors.soullee0180.chatgpt.site`
- ZIP에는 비밀번호, 실제 Supabase 키, `node_modules`, 빌드 결과물, Git 기록이 포함되지 않습니다.

## 먼저 알아야 할 현재 구조

현재 소스에는 저장 방식이 두 종류 있습니다.

| 기능 | 현재 ChatGPT Sites 배포본 | Supabase 연결 코드 |
|---|---|---|
| 로그인 | 설정 전 가상 member/admin 세션 | 이메일·비밀번호 로그인 코드 존재 |
| 투어 설명·여러 사진 | Sites의 D1/R2와 `/api/content` 사용 | 이전 단일 설명용 초안만 존재하며 현재 UI와 연결되지 않음 |
| Admin의 Tour 추가·색상·Archive 콘텐츠 | Sites의 D1/R2와 `/api/content` 사용 | 현재 UI와 완전 연결되지 않음 |
| 익명 설문 제출 | 화면 예시 | `submit-survey` Edge Function 코드 존재 |
| Archive 파일 업로드 | 일부 Sites/미리보기 흐름 | Supabase Storage 업로드 코드 존재 |

따라서 ZIP을 GitHub Pages에 그대로 올리면 공개 화면과 지도는 표시되지만, `/api/content`가 필요한 투어 설명·다중 사진·Admin 저장 기능은 작동하지 않습니다. GitHub Pages는 정적 파일만 호스팅하고 서버 API를 실행하지 않기 때문입니다.

Supabase 환경변수만 현재 Sites 배포본에 넣는 것도 권장하지 않습니다. 브라우저는 Supabase 계정으로 로그인하지만 `/api/content`는 Sites의 ChatGPT 사용자 인증을 확인하므로 쓰기 권한이 서로 일치하지 않습니다.

### 권장 순서

1. 이 ZIP을 GitHub에 올려 현재 소스를 안전하게 보관합니다.
2. Supabase 프로젝트와 DB/Auth/Storage를 준비합니다.
3. 공개 화면과 Supabase 로그인·설문까지만 먼저 검증합니다.
4. 마지막으로 `app/contentApi.ts`의 Sites API를 Supabase DB/Storage로 이관해야 모든 저장 기능이 GitHub Pages에서도 동일하게 작동합니다.

4단계는 단순 설정이 아니라 코드 이관입니다. 현재 화면을 유지하면서 다음 데이터를 Supabase로 옮겨야 합니다.

- `tour_routes`
- `tour_notes`와 여러 장의 `tour_note_images`
- Admin이 생성하는 Archive 콘텐츠와 첨부 파일
- 각 요청의 Supabase access token 전달
- 해당 테이블과 Storage bucket의 RLS 정책

## 1. 필요한 프로그램

Windows 기준으로 다음을 설치합니다.

1. Node.js 22 이상: `https://nodejs.org/`
2. Git: `https://git-scm.com/download/win`
3. VS Code: `https://code.visualstudio.com/`
4. GitHub 계정
5. Supabase 계정

설치 확인:

```powershell
node -v
npm -v
git --version
```

Node 버전은 `v22.x` 이상이면 됩니다.

## 2. ZIP을 풀고 로컬 실행

1. ZIP의 압축을 풉니다.
2. VS Code에서 압축을 푼 `sshs-ambassadors-v28` 폴더를 엽니다.
3. `Terminal → New Terminal`을 엽니다.
4. 다음을 실행합니다.

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

터미널에 표시된 로컬 주소를 브라우저에서 엽니다. Supabase 값을 아직 넣지 않았다면 로그인 화면에 가상 Member/Admin 미리보기 버튼이 보이는 것이 정상입니다.

`.env.local`은 Git에 올라가지 않도록 이미 `.gitignore`에 포함되어 있습니다.

## 3. Supabase 프로젝트 생성

1. `https://supabase.com/dashboard`에서 `New project`를 누릅니다.
2. 프로젝트 이름을 예를 들어 `sshs-ambassadors`로 정합니다.
3. Database password를 만들고 비밀번호 관리자에 저장합니다.
4. 한국과 가까운 Region을 고릅니다.
5. 프로젝트 생성이 끝날 때까지 기다립니다.

공식 안내: `https://supabase.com/docs/guides/getting-started`

## 4. Project URL과 공개 키 확인

Supabase Dashboard의 `Settings → API Keys`에서 다음을 확인합니다.

- Project URL
- Publishable key 또는 Legacy `anon` key

현재 코드와 가장 확실하게 맞추려면 Legacy `anon` key를 사용할 수 있습니다. `service_role`, Secret key, Database password는 브라우저 환경변수나 GitHub 저장소에 절대 넣지 않습니다.

공식 키 안내: `https://supabase.com/docs/guides/getting-started/api-keys`

로컬 `.env.local`에 실제 값을 넣습니다.

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY

VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
VITE_BASE_PATH=/sshs-ambassadors/
```

따옴표는 넣지 않습니다. 실제 `.env.local`은 커밋하지 않습니다.

## 5. Supabase SQL 적용

Supabase Dashboard에서 `SQL Editor → New query`를 엽니다.

다음 파일을 반드시 번호순으로 각각 새 Query에서 실행합니다.

1. `supabase/migrations/202608190001_initial_schema.sql`
2. `supabase/migrations/202608190002_tour_stop_notes.sql`

첫 파일은 profiles, tour, archive, survey 테이블과 RLS, Storage bucket을 만듭니다. 두 번째 파일은 멤버 장소 설명 테이블을 만듭니다.

가상 예시 데이터가 필요할 때만 `supabase/seed.sql`을 실행합니다. 이 seed는 이전 11개 지점 기준이며, 현재 UI의 `library`, `music`, `return-great-hall` slug와 완전히 일치하지 않습니다. 현재 12개 지점의 Supabase 저장 기능을 실제로 연결하기 전에는 seed를 운영 데이터로 사용하지 마세요.

SQL 실행 뒤 `Table Editor`에서 다음이 보이는지 확인합니다.

- `profiles`
- `tour_stops`, `tour_photos`, `tour_stop_notes`
- `archive_collections`, `archive_entries`, `archive_blocks`, `archive_attachments`
- `surveys`, `survey_questions`, `survey_responses`, `survey_answers`

## 6. Supabase Auth 설정

1. `Authentication → Providers → Email`에서 Email provider를 켭니다.
2. 공개 회원가입은 끕니다.
3. `Authentication → URL Configuration`에서 주소를 등록합니다.

예시:

```text
Site URL
https://GITHUB_USERNAME.github.io/sshs-ambassadors/

Redirect URLs
http://localhost:3000/**
http://localhost:4173/**
https://GITHUB_USERNAME.github.io/sshs-ambassadors/**
```

실제 로컬 개발 포트가 다르면 해당 주소를 추가합니다. Redirect URL은 비밀번호 재설정 이메일과 로그인 리디렉션에 사용됩니다.

공식 안내: `https://supabase.com/docs/guides/auth/redirect-urls`

## 7. member와 admin 계정 생성

1. `Authentication → Users`로 이동합니다.
2. `Add user → Send invitation`을 선택합니다.
3. 부원 이메일을 입력해 초대합니다.
4. 사용자가 생성되면 migration의 trigger가 `profiles`에 기본 `member` 역할을 만듭니다.

첫 admin은 `SQL Editor`에서 직접 지정합니다.

```sql
update public.profiles
set role = 'admin'
where email = 'ADMIN_EMAIL_HERE';
```

확인:

```sql
select id, email, role
from public.profiles
order by created_at;
```

공식 사용자 초대 안내: `https://supabase.com/docs/guides/auth/users`

## 8. 익명 설문 Edge Function 배포

프로젝트 폴더의 터미널에서 실행합니다.

```powershell
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy submit-survey --no-verify-jwt
```

허용 사이트 주소를 설정합니다.

```powershell
npx supabase secrets set ALLOWED_ORIGINS="http://localhost:3000,https://GITHUB_USERNAME.github.io"
```

`SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 Supabase Edge Function에 기본 제공되는 서버 값입니다. 직접 코드나 GitHub Pages secret으로 복사하지 않습니다.

공식 안내:

- `https://supabase.com/docs/guides/functions/quickstart`
- `https://supabase.com/docs/guides/functions/secrets`
- `https://supabase.com/docs/guides/functions/cors`

## 9. 로컬 Supabase 연결 확인

환경변수를 저장한 뒤 개발 서버를 다시 시작합니다.

```powershell
npm run dev
```

확인할 내용:

- Login에 가상 미리보기 버튼 대신 이메일·비밀번호 폼이 보임
- member 계정으로 로그인 가능
- admin 계정으로 로그인하면 Admin 메뉴가 보임
- 익명 설문 제출이 Edge Function에 도달함
- 로그아웃 상태에서 Data Archive/Admin 접근이 차단됨

현재 비밀번호 재설정은 메일 요청까지 구현되어 있지만, 재설정 링크 이후 새 비밀번호를 입력하는 전용 화면은 아직 완성되지 않았습니다. 장기 세션의 access token 자동 갱신도 아직 구현되지 않았습니다.

## 10. GitHub 저장소 만들기

GitHub에서 `New repository`를 누르고 다음처럼 만듭니다.

- Repository name: `sshs-ambassadors`
- Visibility: 공개 사이트라면 Public
- README, `.gitignore`, License: 모두 추가하지 않음

이미 로컬에 파일이 있으므로 빈 저장소로 만드는 것이 충돌을 피하기 쉽습니다.

공식 안내: `https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository`

## 11. 현재 코드를 GitHub에 올리기

VS Code 터미널에서 프로젝트 폴더인지 확인한 뒤 실행합니다.

처음 한 번만 Git 작성자 정보를 설정합니다.

```powershell
git config --global user.name "YOUR_NAME"
git config --global user.email "YOUR_GITHUB_EMAIL"
```

저장소 초기화와 첫 업로드:

```powershell
git init
git add .
git status
git commit -m "Initial SSHS Ambassadors site"
git branch -M main
git remote add origin https://github.com/GITHUB_USERNAME/sshs-ambassadors.git
git push -u origin main
```

`git status`에서 `.env.local`, `node_modules`, `dist`, `dist-pages`가 올라가지 않는지 확인한 뒤 commit합니다.

공식 안내:

- `https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github`
- `https://docs.github.com/en/get-started/git-basics/managing-remote-repositories`

## 12. GitHub Actions에 Supabase 값 넣기

GitHub 저장소에서 `Settings → Secrets and variables → Actions`로 이동합니다.

`Variables` 탭:

```text
Name: VITE_SUPABASE_URL
Value: https://YOUR_PROJECT_REF.supabase.co
```

`Secrets` 탭:

```text
Name: VITE_SUPABASE_ANON_KEY
Value: YOUR_PUBLIC_ANON_KEY
```

`service_role`, Supabase Secret key, Database password는 등록하지 않습니다.

## 13. GitHub Pages 켜기

1. `Settings → Pages`로 이동합니다.
2. `Build and deployment → Source`를 `GitHub Actions`로 선택합니다.
3. 이 프로젝트에 포함된 `.github/workflows/deploy.yml`이 `main` push 때 실행됩니다.
4. `Actions → Deploy to GitHub Pages`에서 빌드가 녹색 체크인지 확인합니다.
5. 배포 주소를 엽니다.

```text
https://GITHUB_USERNAME.github.io/sshs-ambassadors/
```

이 프로젝트는 `#/tour`, `#/login` 같은 hash routing을 사용하므로 Pages의 새로고침 404를 피합니다.

공식 안내:

- `https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site`
- `https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages`

## 14. 이후 수정·재배포

코드를 수정한 뒤:

```powershell
git add .
git status
git commit -m "Update campus tour"
git push
```

`main`에 push할 때마다 GitHub Actions가 새 Pages 버전을 배포합니다.

## 15. 배포 후 최종 점검표

### 공개 사용자

- Intro, Tour, Survey가 열림
- 12개 투어 지점과 지도가 정상 표시됨
- 이룸관·음악실 지도가 한 화면 안에 들어옴
- 로그인하지 않은 사용자는 Data Archive/Admin에 들어갈 수 없음

### member

- 이메일·비밀번호 로그인 성공
- Data Archive 열람 가능
- Admin 메뉴는 보이지 않음

### admin

- Admin 메뉴가 보임
- RLS에서 admin 역할이 확인됨

### 현재 소스의 알려진 제한

- GitHub Pages에서는 `/api/content`가 없으므로 투어 설명·다중 사진·새 Tour·Admin Archive 저장은 아직 동작하지 않음
- Supabase의 기존 `tour_stop_notes` 코드는 현재 멤버 설명 UI와 연결되지 않음
- 현재 12개 지점과 `supabase/seed.sql`의 일부 slug가 다름
- 비밀번호 재설정 완료 화면과 access token 자동 갱신이 없음
- Archive의 private 파일 다운로드용 signed URL 발급이 완성되지 않음

이 네 항목까지 해결해야 “현재 ChatGPT Sites 배포본과 같은 저장 기능”이 Supabase + GitHub Pages에서도 완전히 재현됩니다.

## 문제 해결

### GitHub Pages가 빈 화면

- Actions의 `Build static SPA` 단계가 성공했는지 확인합니다.
- 저장소 이름이 `sshs-ambassadors`가 아니라면 workflow가 자동으로 새 base path를 사용하지만, Supabase Redirect URL도 실제 Pages 주소로 바꿔야 합니다.

### 로그인 화면에 가상 미리보기 버튼이 계속 보임

- GitHub Actions 설정 이름이 정확히 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`인지 확인합니다.
- 값을 넣은 뒤 Actions를 다시 실행하거나 새 commit을 push합니다.

### Supabase 401/403

- 해당 사용자의 `profiles.role`을 확인합니다.
- SQL Editor는 RLS를 우회할 수 있으므로 실제 브라우저 계정으로 테스트합니다.
- Supabase Logs에서 실패한 REST/Storage 요청을 확인합니다.

### Secret이 GitHub에 올라감

- 단순 삭제만 하지 말고 Supabase Dashboard에서 해당 Secret을 즉시 폐기·교체합니다.
- Git 기록과 Actions 설정에서도 제거합니다.

