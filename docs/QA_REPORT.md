# QA 보고서

검사일: 2026-08-19  
검사 범위: 로컬 agent preview, Work Site build, GitHub Pages 정적 build, 코드·문서 정적 검토

상태 표기:

- ✅ 완료 및 실제 검증
- 🟨 구현됨, 외부 Supabase가 없어 미검증
- ⏸ 사용자 자료가 없어 보류
- ➖ 의도적으로 제외

| 항목 | 상태 | 결과 |
|---|---|---|
| 의존성 사용 가능 | ✅ | Work Site checkout의 설치된 의존성으로 preview/build 실행 |
| ESLint 정적 검사 | ✅ | 오류 0개; 정적 Pages 호환을 위해 사용한 일반 `<img>` 최적화 권고 1개만 남음 |
| Work Site production build | ✅ | Vinext 5단계 build 및 ESM Worker artifact 검증 성공 |
| GitHub Pages static build | ✅ | `npm run build:pages` 성공, `dist-pages/index.html`과 hashed CSS/JS 생성 |
| Intro 직접 진입 | ✅ | Hero, CTA, 3C 카드, 공식 2025 근거 표시 확인 |
| `#/tour` 직접 진입 | ✅ | 11개 slide 렌더링 확인 |
| Tour 세로 스크롤 | ✅ | 이전/다음 버튼 0개, scroll cue 11개, 11개 정류장 scroll-snap과 진행률 갱신 확인 |
| 지도 투영·경로 | ✅ | 모든 건물의 공통 18단위 돌출, 역사관의 예지관 왼쪽 배치, 과거 2개/현재 1개 경로 색상 분리, 중앙 계단 직선 확인 |
| 지도 확대 | ✅ | modal과 닫기 버튼 구현·미리보기 확인 |
| member 장소 설명 | ✅/🟨 | 가상 member에서 11개 장소 입력 구조, 한영 textarea, 초안 저장 확인; 실제 REST/RLS는 미검증 |
| admin 장소 설명 검토 | ✅/🟨 | 게시·게시 해제·삭제 UI와 REST 연결 구현; 실제 RLS는 미검증 |
| `#/survey` 공개 목록 | ✅ | 로그아웃에서 3개 예시, Result 숨김 확인 |
| Survey 조건부 문항 | ✅ | English 선택 전 4개, 선택 후 5개 문항으로 변경 확인 |
| Survey 제출 | ✅/🟨 | 로컬 fallback 제출 완료 화면 확인; 실제 Edge Function은 미검증 |
| Survey Result 권한 | ✅/🟨 | UI gate와 member 화면 확인; 실제 RLS는 미검증 |
| 결과 요약·차트·표·CSV | ✅ | 역할 미리보기에서 렌더링 및 CSV 코드 확인 |
| Data 로그인 차단 | ✅/🟨 | UI gate 확인; 실제 Supabase RLS는 미검증 |
| member Archive 열람 | ✅ | 3개 컬렉션, 연도, 기록 accordion 확인 |
| member 파일 업로드 | ✅/🟨 | 형식·25MB 검증과 진행 UI 확인; 실제 Storage는 미검증 |
| admin Tour·Survey·Archive 관리 | ✅/🟨 | 상태 변경·편집 UI 확인; 실제 CRUD는 미검증 |
| Supabase migration | 🟨 | PK/FK/index/check/trigger/RLS/Storage policy와 `tour_stop_notes` migration 작성, 실제 프로젝트 미실행 |
| Edge Function | 🟨 | 게시 상태·조건·필수·형식·길이 검증 구현, 실제 배포 미실행 |
| Desktop 약 1360–1440px | ✅ | cloud browser에서 Intro, Tour, Login, Archive, Admin 시각 확인 |
| Tablet 약 768px | 정적 검토 | breakpoint와 2열→1열 전환 확인, 실제 장치 미검증 |
| Mobile 약 390px | 정적 검토 | mobile breakpoint, 가로 표 scroll, 세로 카드 전환 확인, 실제 장치 미검증 |
| 키보드 포커스 | ✅ | `:focus-visible`, 의미 있는 button/label, 스크롤형 Tour 구조 확인 |
| reduced motion | ✅ | media query로 scroll·transition 최소화 |
| 이미지 대체 텍스트 | ✅ | 로고는 장식 처리, SVG title/desc, 업로드 사진 alt 필드 schema 포함 |
| 실제 장소 사진 | ⏸ | 승인된 장소 사진이 아직 제공되지 않아 placeholder/미사용 |
| PPT 게시 | ➖ | 사용자의 요청에 따라 초기 게시에서 제외 |
| 개인정보 자료 | ➖ | 면접 자료 등은 읽기·복사·게시 대상에서 완전히 제외 |

## 외부 연결 후 필수 재검증

1. 로그아웃/member/admin 3개 브라우저 세션에서 모든 RLS 허용·거부 확인
2. private Archive 파일의 직접 URL 접근 차단 확인
3. 실제 member 파일 업로드와 admin 삭제 확인
4. published/draft/closed Survey 각각의 익명 제출 결과 확인
5. Edge Function에 과대 payload, 알 수 없는 question key, 잘못된 scale 값 전송 시 400/413 확인
6. GitHub Pages 실제 하위 경로에서 로고와 JS/CSS asset 확인
7. Supabase Auth reset/redirect가 Work Site와 Pages 모두로 돌아오는지 확인
8. member 초안 추가·본인 수정/삭제와 admin 게시·삭제 RLS 확인

## 알려진 제한

- 실제 Supabase 계정이 연결되지 않은 배포는 가상 역할 미리보기 데이터를 사용한다.
- 관리 UI의 편집 버튼은 콘텐츠 편집 경험을 보여 주는 구현이며, 실제 CRUD 영속화는 Supabase 연결 뒤 API 응답을 기준으로 최종 검증해야 한다.
- 학교 건물 SVG는 방문객용 개략도이며 건축 도면이 아니다.
