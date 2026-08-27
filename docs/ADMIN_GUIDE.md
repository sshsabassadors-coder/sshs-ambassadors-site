# 관리자·부원 사용 가이드

## 역할

- `member`: Tour 설명·사진 초안, Survey 결과, Data Archive 열람·업로드
- `admin`: member 기능과 Tour·Survey·Archive 관리, member 설명 검토
- public: Intro, 게시 Tour/설명, 게시·종료 Survey

## Tour 설명과 사진

1. 로그인하고 `Tour`를 엽니다.
2. 정류장의 `+ 설명 추가`를 누릅니다.
3. 한국어 설명은 필수, 영문과 사진은 선택입니다.
4. 사진은 JPG/PNG/WebP, 한 장당 10MB 이하, 한 설명당 최대 10장입니다.
5. 저장 뒤 `사진·설명 보기`에서 확인합니다.

member 글은 초안으로 저장됩니다. admin은 `Admin → 해당 Tour → MEMBER NOTES`에서 `Publish`, `Unpublish`, `Delete`를 사용할 수 있습니다. admin이 Tour 화면에서 직접 작성한 글은 즉시 게시됩니다.

## Tour 루트 (admin)

- 상단 `＋`로 루트를 추가합니다.
- 루트 탭에서 색상을 바꿉니다.
- `새 항목`에서 기존 지도 위치 중 하나를 선택하고 한영 제목과 게시 상태를 정합니다.
- `Edit`에서 제목·게시 상태를 수정하거나 항목을 삭제합니다.
- 루트가 두 개 이상이면 `루트 삭제`를 사용할 수 있습니다.

지도 도형과 위치 목록 자체는 `app/CampusMap.tsx`, `app/data.ts`의 코드 자산입니다. 완전히 새로운 건물 위치가 필요하면 두 파일도 수정해야 합니다.

## Survey (admin)

- 기본 설문은 migration이 만든 UUID 설문 3개입니다.
- 상태 버튼으로 `published`와 `draft`를 전환합니다.
- `Edit`에서 한영 제목과 게시 상태를 바꾸거나 설문을 삭제합니다.
- `새 항목`은 기본 5문항을 복제해 새 설문을 만듭니다.
- 로그인 사용자는 공개 Survey 화면의 `Result`에서 실제 응답, 평균, 분포, CSV를 확인합니다.

문항 구조를 직접 바꾸려면 현재 버전에서는 Supabase `survey_questions`를 관리해야 합니다. 이름, 학번, 이메일 같은 개인정보 문항은 만들지 않습니다.

## Data Archive

### member

PDF/PPTX/DOCX/XLSX를 25MB 이하로 업로드할 수 있습니다.

- 기록을 펼친 상태에서 올리면 해당 기록에 첨부됩니다.
- 컬렉션 목록에서 올리면 Admin의 `UPLOAD INBOX`에 들어갑니다.
- 파일은 private bucket에 있고 로그인 사용자에게 1시간 signed URL을 발급합니다.

### admin

- `새 콘텐츠`: 컬렉션, 연도, 한영 제목·설명, 선택 파일을 저장합니다.
- `Edit`: 기존 제목·설명을 수정합니다.
- `Delete`: 콘텐츠와 연결 파일을 삭제합니다.
- `UPLOAD INBOX`: member가 기록을 고르지 않고 올린 파일을 열거나 삭제합니다.

## 게시 전 확인

- 학생 이름·학번·연락처·평가 자료가 없는지 확인
- 사진 속 사람의 공개 승인을 확인
- 한글/영문 제목과 표현을 확인
- 파일과 사진 형식·용량을 확인
- 로그아웃 브라우저에서 공개 범위를 다시 확인
