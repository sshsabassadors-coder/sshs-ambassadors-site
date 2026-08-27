# GitHub Pages 배포 가이드

이 프로젝트는 Work Site와 별도로 동일한 화면을 정적 Vite SPA로 빌드할 수 있다. GitHub Pages에서는 `#/intro`, `#/tour` 같은 hash routing을 사용하므로 새로고침 404가 발생하지 않는다.

## 1. 준비

1. [Git](https://git-scm.com/)을 설치한다.
2. [GitHub](https://github.com/) 계정을 준비한다.
3. GitHub에서 `New repository`를 눌러 저장소 이름을 `sshs-ambassadors-site`로 만든다.
4. 공개 저장소를 기본으로 한다. 이 프로젝트에는 개인정보·실제 `.env`·secret을 넣지 않는다.

## 2. 커밋 전 검사

프로젝트 루트에서 다음을 실행한다.

```bash
git status --short
git check-ignore -v .env .env.local 2>/dev/null || true
git grep -n -I -E 'service_role|SUPABASE_SERVICE_ROLE_KEY|BEGIN (RSA|OPENSSH) PRIVATE KEY' -- . ':!docs/*' || true
find . -maxdepth 3 \( -iname '*면접*.zip' -o -iname 'interview_data_*.xlsx' -o -name '.env' -o -name '.env.local' \) -print
```

출력에 실제 key, 비밀번호, 면접 ZIP/Excel, 학생 개인정보가 보이면 push하지 않는다.

## 3. 로컬 Git과 첫 push

```bash
git init
git add .
git commit -m "Initial SSHS Ambassadors site"
git branch -M main
git remote add origin https://github.com/GITHUB_USERNAME/sshs-ambassadors-site.git
git push -u origin main
```

이미 Git 저장소인 경우 `git init`과 중복 remote 추가를 하지 않는다.

## 4. Supabase 값 등록

GitHub 저장소에서 `Settings → Secrets and variables → Actions`를 연다.

- `Variables` 탭에 `VITE_SUPABASE_URL`
- `Secrets` 탭에 `VITE_SUPABASE_ANON_KEY`

anon key는 공개 클라이언트 값이지만 저장소 설정으로 관리하면 교체가 쉽다. `service_role`은 만들거나 등록하지 않는다.

## 5. Pages Source 설정

1. `Settings → Pages`를 연다.
2. `Build and deployment → Source`를 `GitHub Actions`로 선택한다.
3. main branch에 push하면 `.github/workflows/deploy.yml`이 실행된다.
4. `Actions → Deploy to GitHub Pages`에서 녹색 체크를 확인한다.

Workflow는 저장소 이름을 자동으로 `VITE_BASE_PATH`에 넣고 `npm run build:pages` 결과인 `dist-pages/`를 게시한다.

## 6. 배포 주소

기본 주소:

```text
https://GITHUB_USERNAME.github.io/sshs-ambassadors-site/
```

이 주소를 Supabase `Authentication → URL Configuration → Redirect URLs`에 추가한다.

## 7. 수정 후 재배포

```bash
git add .
git commit -m "Update tour content"
git push
```

main push마다 GitHub Actions가 다시 빌드·배포한다.

## 문제 해결

### 빈 화면 또는 asset 404

- Actions 로그에서 `Build static SPA`가 성공했는지 확인한다.
- Workflow의 `VITE_BASE_PATH`가 `/${{ github.event.repository.name }}/`인지 확인한다.
- 저장소 이름을 바꿨다면 다시 push해 새 base path로 빌드한다.

### Pages 404

- 일반 경로(`/tour`)가 아니라 hash 경로(`#/tour`)를 사용한다.
- `Settings → Pages → Source`가 `GitHub Actions`인지 확인한다.

### 로그인 redirect 오류

- Supabase Redirect URL에 Pages 주소와 끝 `/`를 정확히 추가한다.
- Project URL과 anon key가 Actions Variables/Secrets에 들어 있는지 확인한다.
- Workflow를 다시 실행한다.

### 환경 변수가 비어 가상 미리보기 버튼이 나타남

- Actions 설정 이름이 정확히 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`인지 확인한다.
- 저장소를 fork했다면 secret이 자동 복사되지 않는다.

## 선택: custom domain

`Settings → Pages → Custom domain`에서 설정할 수 있지만 초기 운영에는 권장하지 않는다. 적용할 경우 DNS, HTTPS 완료 뒤 새 주소를 Supabase Redirect URLs와 Edge Function `ALLOWED_ORIGINS`에 함께 추가한다.
