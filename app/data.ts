export type Language = "ko" | "en";
export type RouteKey = "intro" | "tour" | "survey" | "data" | "login" | "admin";

export type TourStop = {
  id: string;
  building: [string, string];
  floor: [string, string];
  name: [string, string];
  kicker: [string, string];
  description: [string, string];
  detail: [string, string];
  point: [number, number];
};

export const tourStops: TourStop[] = [
  {
    id: "great-hall",
    building: ["예지관", "Yeji-Gwan"], floor: ["1층", "1F"], name: ["대회의실", "Great Hall"],
    kicker: ["투어의 시작", "The starting point"],
    description: ["학교홍보단과 방문객이 처음 인사를 나누는 곳입니다. 이곳에서 안내를 시작해 학교를 한 바퀴 둘러봅니다.", "This is where our ambassadors first meet visitors and begin the complete campus loop."],
    detail: ["예지관 1층 오른쪽 · 안내 및 출발", "Right side of Yeji-Gwan 1F · Welcome and departure"], point: [700, 395],
  },
  {
    id: "history-hall",
    building: ["예지관", "Yeji-Gwan"], floor: ["1층", "1F"], name: ["역사관", "History Hall"],
    kicker: ["학교의 시간이 모이는 곳", "Where the school story begins"],
    description: ["1989년 개교 이후 이어진 서울과학고의 발자취를 만나는 공간입니다. 전시 자료를 통해 학교의 성장과 학생들의 도전을 살펴봅니다.", "Explore the story of Seoul Science High School since its opening in 1989 through records of the school and its students."],
    detail: ["예지관 1층 · 대회의실에서 조금 왼쪽", "Yeji-Gwan 1F · Just left of the Great Hall"], point: [610, 400],
  },
  {
    id: "maker-wind",
    building: ["예지관", "Yeji-Gwan"], floor: ["1층", "1F"], name: ["풍동실·창작실", "Wind Tunnel & Maker Space"],
    kicker: ["아이디어를 실험으로", "From idea to experiment"],
    description: ["풍동 실험 장비와 디지털 제작 도구를 활용하는 공간입니다. 서로 다른 두 실을 하나의 정류장으로 묶어 소개합니다.", "A combined stop introducing wind-tunnel experiments and digital fabrication tools across two neighboring rooms."],
    detail: ["풍동 · 3D 프린터 · 레이저 커터", "Wind tunnel · 3D printers · Laser cutter"], point: [490, 407],
  },
  {
    id: "observatory",
    building: ["예지관", "Yeji-Gwan"], floor: ["옥상", "Rooftop"], name: ["천문대", "Observatory"],
    kicker: ["도시 위에서 우주를 관측하다", "Observing beyond the city"],
    description: ["예지관 중앙 계단을 따라 옥상까지 올라갑니다. 대구경 굴절망원경과 관측 장비를 활용한 천문 관측 활동이 이루어집니다.", "The central staircase leads to the rooftop observatory, home to a large-aperture refracting telescope and observation systems."],
    detail: ["예지관 중앙 계단 이용", "Via the central Yeji-Gwan staircase"], point: [500, 240],
  },
  {
    id: "biology",
    building: ["예지관", "Yeji-Gwan"], floor: ["4층", "4F"], name: ["생물과", "Biology"],
    kicker: ["생명 현상을 탐구하는 실험실", "Exploring living systems"],
    description: ["생물 수업과 실험이 이루어지는 공간을 함께 소개합니다. 현미경 관찰부터 분자생물학 실험까지 다양한 탐구가 이어집니다.", "Biology classrooms and laboratories support inquiry ranging from microscopy to molecular biology experiments."],
    detail: ["중앙 계단에서 4층 복도로 이동", "From the central staircase to the fourth-floor corridor"], point: [630, 305],
  },
  {
    id: "physics",
    building: ["예지관", "Yeji-Gwan"], floor: ["3층", "3F"], name: ["물리과", "Physics"],
    kicker: ["현상을 측정하고 모델링하다", "Measure, model, understand"],
    description: ["물리 수업과 실험 공간을 하나의 정류장으로 소개합니다. 광학, 전자기학, 진동 등 다양한 실험 장비를 활용합니다.", "Physics classrooms and laboratories bring together experiments in optics, electromagnetism, vibration, and more."],
    detail: ["중앙 계단으로 3층 이동", "Down the central staircase to 3F"], point: [560, 337],
  },
  {
    id: "earth-science",
    building: ["예지관", "Yeji-Gwan"], floor: ["2층", "2F"], name: ["지구과학과", "Earth Science"],
    kicker: ["지구와 대기를 읽는 실험실", "Reading Earth and atmosphere"],
    description: ["암석 박편 관찰과 대기 측정 등 지구과학 수업·실험 공간을 함께 소개합니다.", "Earth Science classrooms and laboratories support work such as rock-section observation and atmospheric measurement."],
    detail: ["예지관 2층 ↔ 융합인재관 2층 가교", "Second-floor bridge to Yung-hap"], point: [650, 367],
  },
  {
    id: "library",
    building: ["융합인재관", "Yung-hap In-jae Gwan"], floor: ["2층", "2F"], name: ["이룸관(도서관)", "Irum Library"],
    kicker: ["읽기와 자습이 이어지는 중심", "A hub for reading and study"],
    description: ["예지관 2층과 가교로 연결된 도서관입니다. 자료 탐색, 독서, 자습이 자연스럽게 이어지는 공간입니다.", "Connected to Yeji-Gwan by a second-floor bridge, the library supports research, reading, and independent study."],
    detail: ["예지관 2층 ↔ 융합인재관 2층 가교", "2F-to-2F bridge from Yeji-Gwan"], point: [855, 344],
  },
  {
    id: "music",
    building: ["융합인재관", "Yung-hap In-jae Gwan"], floor: ["1층", "1F"], name: ["음악실", "Music Room"],
    kicker: ["과학자의 감각을 넓히는 소리", "Sound beyond science"],
    description: ["도서관에서 융합인재관 내부 계단으로 내려오면 만나는 음악 공간입니다.", "Reach the Music Room by taking the internal staircase down from the library on the second floor."],
    detail: ["융합인재관 내부 계단 이용", "Via the internal Yung-hap staircase"], point: [870, 382],
  },
  {
    id: "chemistry",
    building: ["창의인재관", "Chang-ui In-jae Gwan"], floor: ["2층", "2F"], name: ["화학과", "Chemistry"],
    kicker: ["물질의 변화를 정밀하게 관찰하다", "Observing change with precision"],
    description: ["융합인재관 밖의 연결 통로를 지나 창의인재관 계단참으로 이동합니다. 화학 수업과 실험 공간을 함께 소개합니다.", "An outdoor connecting walkway leads to the Chang-ui stair landing and the Chemistry classrooms and laboratories."],
    detail: ["실외 연결 통로 · 창의인재관 계단", "Outdoor walkway · Chang-ui staircase"], point: [970, 455],
  },
  {
    id: "computer-science",
    building: ["창의인재관", "Chang-ui In-jae Gwan"], floor: ["1층", "1F"], name: ["정보과", "Computer Science"],
    kicker: ["논리와 코드로 문제를 해결하다", "Solving problems through code"],
    description: ["창의인재관의 정보 수업과 실습 공간을 하나의 정류장으로 소개합니다. 이곳을 본 뒤 아래쪽 계단과 통로를 따라 예지관으로 돌아갑니다.", "Computer Science classrooms and practical spaces form the final stop before the lower stairway returns us to Yeji-Gwan."],
    detail: ["창의인재관 1층 · 계단 아래", "Chang-ui 1F · Below the staircase"], point: [970, 495],
  },
  {
    id: "return-great-hall",
    building: ["예지관", "Yeji-Gwan"], floor: ["1층", "1F"], name: ["대회의실", "Great Hall"],
    kicker: ["다시 출발점으로", "Back where we began"],
    description: ["정보과에서 아래쪽 계단과 연결 통로를 따라 예지관으로 돌아옵니다. 대회의실에서 마지막 인사를 나누며 투어를 마칩니다.", "From Computer Science, the lower stairs and connecting path lead back to Yeji-Gwan. The tour closes with a final farewell in the Great Hall."],
    detail: ["예지관 1층 오른쪽 · 투어 마무리", "Right side of Yeji-Gwan 1F · Tour closing"], point: [700, 395],
  },
];

export const copy = {
  ko: {
    nav: { intro: "Intro", tour: "Tour", survey: "Survey", data: "Data Archive", login: "로그인", admin: "Admin" },
    eyebrow: "SEOUL SCIENCE HIGH SCHOOL · STUDENT AMBASSADORS",
    heroTitleA: "Connecting SSHS", heroTitleB: "to the World.", heroSub: "The Voice of Korea’s Young Scientists",
    heroBody: "서울과학고 학생의 시선으로 학교의 연구 문화, 공간, 그리고 일상을 만나보세요.",
    startTour: "투어 시작하기", meetUs: "홍보단 알아보기",
    introLabel: "WHO WE ARE", introTitle: "과학을 설명하고, 사람을 연결합니다.",
    introBody: "SSHS Ambassadors는 방문객과 서울과학고를 잇는 학생홍보단입니다. 교실과 실험실의 정보를 넘어, 우리가 어떻게 질문하고 협업하는지를 학생의 목소리로 전합니다.",
    facts: ["1989년 개교", "3C Learner Profile", "2025년 기준 4,836명 졸업"],
    values: [["Collaboration", "서로 다른 관점을 이해하고 함께 답을 찾습니다."], ["Creativity", "여러 분야의 지식을 연결해 새로운 가능성을 만듭니다."], ["Challenge", "과학의 경계를 자신 있게 탐구합니다."]],
    tourLabel: "GUIDED CAMPUS TOUR", tourTitle: "12개의 정류장, 하나의 순환 경로",
    tourBody: "화면을 아래로 스크롤하면 12개 장소가 순서대로 이어집니다. 각 지도는 현재 정류장 주변을 확대한 방문객용 개략도입니다.",
    previous: "이전", next: "다음", mapLegend: "현재 위치", routeLegend: "투어 경로", zoom: "지도 크게 보기", close: "닫기",
    floorPlan: "현재 정류장 주변 확대 개략도 · 실제 축척과 다름", placeholderTitle: "다음 화면을 준비하고 있습니다.",
    placeholderBody: "Survey, Archive, Login, Admin 기능은 다음 구현 단계에서 이 디자인 시스템과 연결됩니다.", backIntro: "Intro로 돌아가기", language: "EN",
  },
  en: {
    nav: { intro: "Intro", tour: "Tour", survey: "Survey", data: "Data Archive", login: "Login", admin: "Admin" },
    eyebrow: "SEOUL SCIENCE HIGH SCHOOL · STUDENT AMBASSADORS",
    heroTitleA: "Connecting SSHS", heroTitleB: "to the World.", heroSub: "The Voice of Korea’s Young Scientists",
    heroBody: "Discover our research culture, campus, and everyday life through the eyes of Seoul Science High School students.",
    startTour: "Start the tour", meetUs: "Meet the ambassadors",
    introLabel: "WHO WE ARE", introTitle: "We explain science and connect people.",
    introBody: "SSHS Ambassadors is a student team connecting visitors with Seoul Science High School. Beyond rooms and facilities, we share how students ask questions, collaborate, and grow.",
    facts: ["Founded in 1989", "3C Learner Profile", "4,836 graduates by 2025"],
    values: [["Collaboration", "We understand different perspectives and find answers together."], ["Creativity", "We connect disciplines to create new possibilities."], ["Challenge", "We explore the frontiers of science with confidence."]],
    tourLabel: "GUIDED CAMPUS TOUR", tourTitle: "12 stops. One complete loop.",
    tourBody: "Scroll down to move naturally through all 12 stops. Each map is a visitor-friendly close-up of the current stop.",
    previous: "Previous", next: "Next", mapLegend: "You are here", routeLegend: "Tour route", zoom: "Expand map", close: "Close",
    floorPlan: "Current-stop close-up · Not to scale", placeholderTitle: "This section is on its way.",
    placeholderBody: "Survey, Archive, Login, and Admin will connect to this design system in the next build stage.", backIntro: "Back to Intro", language: "한글",
  },
} as const;
