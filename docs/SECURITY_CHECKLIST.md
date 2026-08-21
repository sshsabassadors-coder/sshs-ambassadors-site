# 실용 보안 체크리스트

소규모 동아리 내부 운영에 필요한 기본 보호만 적용한다. CAPTCHA, 강제 MFA, 별도 바이러스 검사 시스템, 복잡한 감사 로그는 초기 범위에서 제외한다.

## 배포 전 필수

- [ ] 새 Supabase 프로젝트를 사용했다.
- [ ] 기존 HTML의 Supabase URL·key와 Firebase 설정을 복사하지 않았다.
- [ ] `.env`, 실제 key, 비밀번호, 복구 코드가 Git에 없다.
- [ ] `service_role`/secret key가 브라우저·GitHub Pages·문서 예시에 없다.
- [ ] 공개 회원가입을 껐다.
- [ ] 실제 member/admin 계정을 초대 방식으로 만들었다.
- [ ] `profiles.role`이 의도대로 지정되었다.
- [ ] 모든 public 테이블에서 RLS가 켜져 있다.
- [ ] `archive-files` bucket이 private이다.
- [ ] 로그아웃 사용자가 Survey 결과·Archive URL을 직접 열 수 없다.
- [ ] member가 Archive 컬렉션·기록을 수정/삭제할 수 없다.
- [ ] admin만 Tour·Survey·Archive를 수정/삭제할 수 있다.
- [ ] member 장소 설명은 본인 초안만 수정·삭제할 수 있고 게시 권한은 admin에게만 있다.
- [ ] 익명 설문은 Edge Function으로만 저장된다.
- [ ] Edge Function의 `ALLOWED_ORIGINS`를 실제 배포 주소로 설정했다.

## 콘텐츠

- [ ] 면접 평가 엑셀·ZIP이 저장소와 Archive에 없다.
- [ ] 이름, 학번, 연락처, 개별 평가가 예시 데이터에 없다.
- [ ] 공개 승인된 로고·사진만 사용했다.
- [ ] 브로슈어 사진과 인터넷 캠퍼스 지도를 재호스팅하지 않았다.
- [ ] PPT를 올리기 전 담당자 이름, 연락처, QR, 지난 마감일을 검사했다.
- [ ] 외부 링크는 `https://`이고 실제 목적지를 확인했다.
- [ ] 임의 HTML을 DB에 저장하거나 `innerHTML`로 렌더링하지 않는다.
- [ ] member 장소 설명에 이름·학번·연락처가 없는지 admin이 게시 전에 확인한다.

## 파일 업로드

- [ ] Tour 이미지는 JPG/PNG/WebP 10MB 이하이다.
- [ ] Archive는 PDF/PPTX/DOCX/XLSX 25MB 이하이다.
- [ ] ZIP, HTML, SVG, 실행 파일을 허용하지 않는다.
- [ ] DB metadata와 Storage object 삭제가 admin에게만 허용된다.
- [ ] member 업로드는 로그인한 계정의 `uploader_id`로 기록된다.

## 운영 중

- [ ] 학기마다 불필요한 member 계정을 비활성화한다.
- [ ] admin 수를 최소화한다.
- [ ] key가 노출되면 즉시 교체하고 Logs를 확인한다.
- [ ] 이상한 업로드가 보이면 쓰기 정책을 잠시 차단하고 확인한다.
- [ ] 실제 공개 범위가 바뀌면 RLS와 Storage 정책을 함께 수정한다.

## 의도적으로 제외한 고급 항목

- CAPTCHA/Turnstile: 스팸이 실제 발생할 때 추가
- 강제 MFA: 소수 admin 운영에서 필요해지면 활성화
- 바이러스 스캔 pipeline: 실행 파일과 ZIP을 받지 않는 초기 운영에서는 제외
- 장기 감사 로그·SIEM: 현재 규모에서는 제외

보안을 화면에서 버튼을 숨기는 것으로 끝내지 않는다. 최종 권한 판단은 항상 Supabase RLS와 Storage policy가 한다.
