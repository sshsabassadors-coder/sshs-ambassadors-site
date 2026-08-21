# Supabase 설정 가이드

대상: Supabase를 처음 사용하는 관리자  
원칙: 기존 프로젝트는 건드리지 않고 새 프로젝트를 만든다. 실제 키·비밀번호·복구 코드를 채팅이나 Git 저장소에 올리지 않는다.

## 1. 새 프로젝트 생성

1. [Supabase Dashboard](https://supabase.com/dashboard)에 로그인한다.
2. `New project`를 누른다.
3. Organization을 고르고 이름을 `sshs-ambassadors`로 입력한다.
4. 강한 Database password를 만들고 비밀번호 관리자에 보관한다.
5. Region은 한국과 가까운 위치를 고른다.
6. 프로젝트 준비가 끝날 때까지 기다린다.

## 2. Project URL과 anon key 확인

Dashboard의 `Project Settings → API`에서 다음 두 값만 확인한다.

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_URL`
- `anon` 또는 `publishable` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VITE_SUPABASE_ANON_KEY`

`service_role`/secret key는 프런트엔드 `.env`, GitHub Pages, 브라우저 코드에 절대 넣지 않는다.

## 3. Migration 실행

1. `SQL Editor → New query`를 연다.
2. `supabase/migrations/202608190001_initial_schema.sql` 전체를 붙여 넣고 `Run`을 한 번 누른다.
3. 이어서 `supabase/migrations/202608190002_tour_stop_notes.sql`을 새 query에서 실행한다. 파일명 번호 순서를 바꾸지 않는다.
4. `Table Editor`에서 다음 테이블이 생겼는지 확인한다.
   - `profiles`, `tour_stops`, `tour_photos`, `tour_stop_notes`
   - `archive_collections`, `archive_entries`, `archive_blocks`, `archive_attachments`
   - `surveys`, `survey_questions`, `survey_responses`, `survey_answers`
5. 오류가 나면 같은 SQL을 반복 실행하기 전에 오류 줄을 기록한다. enum이나 policy가 일부 만들어진 상태에서 무작정 재실행하지 않는다.

개인정보 없는 가상 예시가 필요하면 `SQL Editor`에서 `supabase/seed.sql`을 실행한다. 실제 운영 자료가 아니며 언제든 교체할 수 있다.

## 4. Storage 확인

`Storage` 화면에서 migration이 만든 두 bucket을 확인한다.

| Bucket | 공개 여부 | 허용 파일 | 제한 |
|---|---|---|---:|
| `tour-images` | Public | JPG, PNG, WebP | 10MB |
| `archive-files` | Private | PDF, PPTX, DOCX, XLSX | 25MB |

Archive URL을 공개 문자열로 저장하지 않는다. 로그인 사용자가 요청할 때 Supabase 인증을 붙이거나 짧은 signed URL을 발급한다.

## 5. Auth 이메일 설정

1. `Authentication → Providers → Email`을 연다.
2. Email provider를 켠다.
3. `Allow new users to sign up` 또는 공개 가입 옵션을 끈다.
4. 운영 규모가 작으므로 초기에는 이메일 확인과 비밀번호 재설정만 사용한다.
5. 공개 회원가입 화면은 사이트에 만들지 않는다.

## 6. Site URL과 Redirect URL

`Authentication → URL Configuration`에서 설정한다.

- Site URL: 실제 배포 주소
- Redirect URLs:
  - Work Site 주소
  - `https://GITHUB_USERNAME.github.io/sshs-ambassadors/`
  - 로컬 개발 주소(개발 중에만)

주소 뒤의 `/`와 저장소 하위 경로가 실제 배포와 일치해야 한다.

## 7. 첫 member/admin 계정 생성

### 계정 초대

1. `Authentication → Users → Add user`에서 이메일로 사용자를 초대하거나 생성한다.
2. 초대된 사용자가 처음 로그인하면 `handle_new_user` trigger가 `profiles`에 기본 `member`를 만든다.

### 첫 admin 지정

계정을 만든 뒤 `SQL Editor`에서 실제 admin 이메일을 직접 바꾸어 실행한다.

```sql
update public.profiles
set role = 'admin'
where email = 'ADMIN_EMAIL_HERE';
```

확인:

```sql
select id, email, role from public.profiles order by created_at;
```

초기 admin 지정 이후에는 사이트 Admin 화면 또는 제한된 SQL 작업으로 역할을 관리한다. 첫 admin 이메일을 프로젝트 파일에 하드코딩하지 않는다.

## 8. 익명 설문 Edge Function 배포

Supabase CLI를 설치하고 프로젝트 폴더에서 실행한다.

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy submit-survey --no-verify-jwt
```

`--no-verify-jwt`는 게시된 설문에 익명 응답을 허용하기 위한 것이다. 함수 내부가 설문 상태, 질문 목록, 필수 여부, 조건부 표시, 값 형식과 길이를 다시 검증한다.

허용 출처를 지정한다.

```bash
npx supabase secrets set ALLOWED_ORIGINS="https://YOUR_SITE_URL,https://GITHUB_USERNAME.github.io"
```

Supabase가 기본 제공하는 `SUPABASE_URL`과 `SUPABASE_SERVICE_ROLE_KEY`는 Edge Function 서버 환경에서만 읽는다. 값을 코드에 붙여 넣지 않는다.

## 9. 로컬 `.env.local` 작성

`.env.example`을 복사하고 실제 값은 로컬 파일에만 넣는다.

```bash
cp .env.example .env.local
```

Work Site 개발:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

GitHub Pages 빌드는 `VITE_` 두 값을 사용한다. `.env.local`과 `.env`는 `.gitignore`에 포함되어 있다.

## 10. 역할별 RLS 검증

### Public/로그아웃

- published Tour/Survey 조회: 허용
- 게시된 장소 설명만 조회: 허용
- Survey Result, Archive 조회: 거부
- `survey_responses`, `survey_answers` 직접 insert: 거부
- Edge Function을 통한 published Survey 제출: 허용

### member

- published Archive 조회: 허용
- `archive-files` 업로드: 허용
- 각 Tour 장소에 설명 초안 추가·본인 초안 수정/삭제: 허용
- 다른 member 초안 게시 상태 변경: 거부
- Archive 컬렉션·기록 수정/삭제: 거부
- Survey 결과 조회: 허용
- Tour/Survey 관리: 거부

### admin

- Tour·Survey·Archive CRUD: 허용
- member 장소 설명 검토·게시·삭제: 허용
- 파일 수정/삭제: 허용
- 사용자 role 관리: 허용

Dashboard의 SQL Editor는 소유자 권한으로 RLS를 우회할 수 있으므로 RLS 검증 수단이 아니다. 실제 로그아웃 브라우저, member 계정, admin 계정으로 각각 사이트를 열어 확인한다. 네트워크 응답이 `401/403`인지도 함께 본다.

## 11. 키가 노출되었을 때

1. 무엇이 노출되었는지 구분한다.
   - anon/publishable key: RLS가 올바르면 공개 사용을 전제로 하지만, 잘못된 정책이 없는지 즉시 확인한다.
   - secret/service_role: 즉시 사고로 취급한다.
2. `Project Settings → API`에서 해당 secret을 교체한다.
3. GitHub Variables/Secrets와 배포 환경 값을 새 값으로 갱신한다.
4. 이전 배포와 Git 기록에 secret이 남아 있으면 단순히 최신 커밋에서 삭제하는 것으로 끝내지 않는다. 저장소 관리자에게 기록 정리와 key 폐기를 요청한다.
5. `Logs`에서 비정상 insert/update/delete와 Storage 업로드를 확인한다.
6. 필요한 경우 RLS/Storage 쓰기를 잠시 차단한다.

## 연결 후 제거할 미리보기 기능

Supabase 환경 변수가 정상 주입되면 Login의 가상 member/admin 버튼은 자동으로 보이지 않는다. 실제 계정으로 공개·member·admin 흐름을 모두 재검증한 뒤 운영을 시작한다.
