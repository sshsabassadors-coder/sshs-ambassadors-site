# Supabase 설정 요약

초보자용 전체 순서는 [`../START_HERE_KO.md`](../START_HERE_KO.md)를 따릅니다.

## Migration

새 Supabase 프로젝트에서는 아래 파일을 번호순으로 각각 한 번 실행합니다.

1. `202608190001_initial_schema.sql`
2. `202608190002_tour_stop_notes.sql`
3. `202608270001_tour_note_images.sql`
4. `202608270002_complete_github_pages.sql`

앞의 세 파일이 이미 적용된 운영 프로젝트에는 네 번째 파일만 실행합니다. `supabase/seed.sql`은 이전 정류장 구조이므로 운영 프로젝트에 실행하지 않습니다.

네 번째 migration은 다음을 완성합니다.

- `tour_routes`, `tour_route_stops`와 Admin RLS
- `tour_stop_notes.route_id`
- 12개 기본 루트 정류장
- 실제 UUID를 사용하는 설문 3개와 질문 15개
- Archive 컬렉션 3개

## Auth

- Email provider를 사용합니다.
- 공개 회원가입은 끕니다.
- 새 사용자는 `profiles.role = member`로 생성됩니다.
- 첫 admin은 SQL로 지정합니다.

```sql
update public.profiles
set role = 'admin'
where email = 'ADMIN_EMAIL_HERE';
```

GitHub Pages 주소를 `Authentication → URL Configuration`의 Site URL과 Redirect URLs에 등록합니다. 비밀번호 재설정 link가 같은 Pages 경로로 돌아와야 합니다.

## Storage

| Bucket | 공개 여부 | 허용 파일 | 제한 |
|---|---|---|---:|
| `tour-images` | Public | JPG, PNG, WebP | 10MB |
| `archive-files` | Private | PDF, PPTX, DOCX, XLSX | 25MB |

Archive 파일은 로그인 session으로 만든 짧은 signed URL로만 엽니다.

## Edge Function

```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase functions deploy submit-survey --no-verify-jwt
npx supabase secrets set ALLOWED_ORIGINS="https://YOUR_GITHUB_ID.github.io,http://localhost:3000,http://localhost:5173"
```

`--no-verify-jwt`는 공개 익명 응답에 필요합니다. Function 내부에서 설문 상태, 문항, 조건, 길이와 값 형식을 다시 검증합니다.

## 키 사용 원칙

- 브라우저/GitHub Pages: publishable 또는 anon key만 사용
- Edge Function: Supabase가 제공하는 서버 전용 service-role 환경 사용
- 코드, `.env.example`, GitHub Pages에 secret/service-role key를 넣지 않음

## 권한 확인

| 역할 | Tour | Survey | Archive | Admin |
|---|---|---|---|---|
| public | 게시 루트·게시 설명 읽기 | 게시 설문 제출 | 차단 | 차단 |
| member | 설명 초안·본인 사진 추가 | 결과 읽기 | 게시 자료 읽기·파일 업로드 | 차단 |
| admin | 루트 CRUD·설명 게시/삭제 | 설문 CRUD·결과 | 콘텐츠 CRUD·파일 관리 | 허용 |

Dashboard SQL Editor는 RLS를 우회할 수 있습니다. 실제 로그아웃 브라우저, member 계정, admin 계정으로 각각 확인해야 합니다.
