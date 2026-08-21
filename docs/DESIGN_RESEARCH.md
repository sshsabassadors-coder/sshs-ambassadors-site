# 공식 사이트 디자인 조사

확인일: 2026-08-19

코드·문구·로고·사진을 복제하지 않고 정보 구조와 상호작용 원칙만 참고했다.

| 공식 사이트 | 확인한 페이지 | 관찰한 점 | SSHS 적용 |
|---|---|---|---|
| MIT | [Visit MIT](https://www.mit.edu/visit/) | 방문 목적을 투어·정보 세션·자율 탐방처럼 빠르게 분기한다. 방문자가 다음 행동을 즉시 찾을 수 있다. | Intro 첫 화면에 Tour와 Survey CTA를 명확히 분리했다. |
| Stanford University | [Explore Campus](https://visit.stanford.edu/explore-campus) | self-guided route, 관심 지점, 설명을 하나의 방문 흐름으로 묶는다. | SVG 경로와 정류장 설명을 같은 Tour 화면에 배치했다. |
| Yale University | [Yale Visitor Center](https://visitorcenter.yale.edu/) | 방문 유형을 구분하고, 학생 가이드가 전달하는 역사·건축·학생 생활의 맥락을 강조한다. | 시설 목록보다 학생의 설명과 정류장별 이야기 구조를 앞세웠다. |
| Caltech | [Visit & Connect](https://www.admissions.caltech.edu/visit) | 캠퍼스 방문과 온라인 경험을 같은 시각적 계층에서 제공하며, 숫자와 짧은 설명을 함께 쓴다. | 2025년 근거가 있는 숫자만 Hero에 작게 표시하고, 투어 경험을 독립 CTA로 구성했다. |
| Merton College, Oxford | [Student Ambassadors](https://www.merton.ox.ac.uk/our-work-with-schools/student-ambassadors) | 공식 기관 정보와 학생 관점의 친근한 설명을 함께 제공한다. | 학교 공식 사실과 홍보단의 학생 목소리를 구분해 Intro 문구를 작성했다. |

## 최종 디자인 시스템

- Deep navy `#0B2265`, dark navy `#061744`, active blue `#005CE6`
- 경로·현재 위치·핵심 작업은 vivid pink `#FF2D8D`
- 배경은 흰색과 차가운 중립 회색으로 제한
- 과도한 그림자 대신 1px 경계, 큰 여백, 숫자·라벨을 사용한 편집 디자인
- Hero의 그리드와 원형 궤도는 과학적·국제적 인상을 주는 CSS 장식이며 외부 이미지를 사용하지 않음
- 지도는 예시 사진의 아이소메트릭 덩어리감만 참고하고 학교 배치에 맞게 새 SVG로 작성
- 모바일에서는 한 화면에 정보를 압축하지 않고 지도·설명·관리 표를 세로 흐름이나 가로 스크롤로 전환
- 모든 인터랙션은 키보드 포커스가 보이며 `prefers-reduced-motion`에서 이동 애니메이션을 최소화

