# QA 보고서

검사일: 2026-08-27

## 자동 검증 결과

| 검사 | 결과 |
|---|---|
| ESLint | 오류 0개, 일반 `<img>` 최적화 경고 3개 |
| Vinext production build | 성공, ESM Worker와 hosting manifest 검증 |
| production HTML test | 1/1 통과, 개발 preview metadata 없음 |
| GitHub Pages Vite build | 성공, `dist-pages/index.html`과 hashed CSS/JS 생성 |
| TypeScript 앱 코드 | Pages build의 strict TypeScript 변환 통과 |

## 코드 검토로 확인한 수정

- Tour 설명 load/create에 현재 route와 로그인 session 연결
- Supabase JS v2의 session 저장·자동 갱신·URL recovery 처리
- 사진 형식/용량/개수 검증과 부분 실패 rollback
- Tour route/route-stop Supabase CRUD와 public/admin RLS
- 실제 UUID Survey 조회·제출·결과·CSV
- private Archive signed URL, 파일 metadata, Admin CRUD와 inbox
- password recovery 후 새 비밀번호 입력 화면
- GitHub Pages 브라우저 흐름의 `/api/content` 의존 제거

## 외부 서비스에서 남은 필수 검증

소스 빌드만으로 Supabase 운영 프로젝트나 GitHub 계정을 변경할 수 없으므로 아래는 배포자가 직접 확인해야 합니다.

1. `202608270002_complete_github_pages.sql` 실행 성공
2. `submit-survey` Edge Function 재배포
3. GitHub Actions Variable/Secret 주입
4. Supabase Auth redirect URL 등록
5. 로그아웃/member/admin 실제 RLS 테스트
6. member 설명+PNG 저장 후 새로고침, admin 게시, public 표시
7. Archive private 파일의 로그아웃 접근 차단
8. 비밀번호 재설정 메일 link와 완료 화면

외부 연결 절차와 테스트 순서는 [`../START_HERE_KO.md`](../START_HERE_KO.md)에 있습니다.
