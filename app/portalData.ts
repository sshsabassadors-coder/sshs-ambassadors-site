export type QuestionType = "scale" | "single" | "long" | "short" | "multiple" | "yesno";

export type SurveyQuestion = {
  id: string;
  labelKo: string;
  labelEn: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  showWhen?: { questionId: string; equals: string };
};

export type Survey = {
  id: string;
  number: number;
  titleKo: string;
  titleEn: string;
  date: string;
  descriptionKo: string;
  descriptionEn: string;
  status: "published" | "closed" | "draft";
  questions: SurveyQuestion[];
};

const defaultQuestions: SurveyQuestion[] = [
  { id: "satisfaction", labelKo: "투어에 얼마나 만족하셨나요?", labelEn: "How satisfied were you with the tour?", type: "scale", required: true },
  { id: "language", labelKo: "투어에서 사용한 언어", labelEn: "Language used during the tour", type: "single", required: true, options: ["한국어", "English"] },
  { id: "english", labelKo: "학생들의 영어 설명은 어땠나요?", labelEn: "How would you rate the students’ English presentation?", type: "scale", required: true, showWhen: { questionId: "language", equals: "English" } },
  { id: "knowledge", labelKo: "학생들의 투어 내용 숙지도", labelEn: "How well did the students know the tour content?", type: "scale", required: true },
  { id: "comment", labelKo: "그 밖에 전하고 싶은 의견", labelEn: "Anything else you would like to share?", type: "long", required: false },
];

export const initialSurveys: Survey[] = [
  {
    id: "visitor-tour-2026", number: 1, titleKo: "학교 방문 투어", titleEn: "Campus Visitor Tour", date: "2026-08-18",
    descriptionKo: "오늘의 투어 경험을 알려주세요. 응답은 익명으로 저장됩니다.", descriptionEn: "Tell us about today’s tour. Your response is anonymous.",
    status: "published", questions: defaultQuestions,
  },
  {
    id: "global-exchange-2026", number: 2, titleKo: "국제 교류단 투어", titleEn: "International Exchange Tour", date: "2026-07-24",
    descriptionKo: "영문 투어의 설명과 동선에 대한 의견을 받습니다.", descriptionEn: "Share feedback on the English-language route and presentation.",
    status: "published", questions: defaultQuestions,
  },
  {
    id: "science-fair-2026", number: 3, titleKo: "과학전람회 공개 투어", titleEn: "Science Fair Open Tour", date: "2026-06-12",
    descriptionKo: "응답 기간이 종료된 설문입니다.", descriptionEn: "This survey is now closed.",
    status: "closed", questions: defaultQuestions,
  },
];

export const sampleResponses = [
  { id: "R-018", submittedAt: "2026-08-18 14:32", satisfaction: 5, language: "English", english: 5, knowledge: 5, comment: "The observatory story was especially memorable." },
  { id: "R-017", submittedAt: "2026-08-18 14:29", satisfaction: 4, language: "한국어", english: null, knowledge: 5, comment: "실험실을 조금 더 오래 보고 싶어요." },
  { id: "R-016", submittedAt: "2026-08-18 14:25", satisfaction: 5, language: "English", english: 4, knowledge: 4, comment: "Clear route and confident guides." },
  { id: "R-015", submittedAt: "2026-08-18 14:21", satisfaction: 4, language: "한국어", english: null, knowledge: 4, comment: "지도가 있어서 다음 장소를 이해하기 쉬웠습니다." },
  { id: "R-014", submittedAt: "2026-08-18 14:15", satisfaction: 5, language: "English", english: 5, knowledge: 5, comment: "Excellent explanations and pacing." },
  { id: "R-013", submittedAt: "2026-08-18 14:10", satisfaction: 3, language: "한국어", english: null, knowledge: 4, comment: "계단 이동 전에 안내가 한 번 더 있으면 좋겠습니다." },
];

export type ArchiveEntry = {
  id: string;
  year: number;
  date: string;
  titleKo: string;
  titleEn: string;
  subtitleKo: string;
  subtitleEn: string;
  summaryKo: string;
  summaryEn: string;
  files: { name: string; type: string; size: string; url?: string }[];
};

export type ArchiveCollection = {
  id: string;
  code: string;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  accent: string;
  published: boolean;
  entries: ArchiveEntry[];
};

export const initialCollections: ArchiveCollection[] = [
  {
    id: "tour-notes", code: "TOUR NOTES", titleKo: "투어 운영 기록", titleEn: "Tour Operations",
    summaryKo: "방문 일정, 동선 검토, 운영 회고를 연도별로 정리합니다.", summaryEn: "Visit schedules, route reviews, and operational retrospectives by year.",
    accent: "#005ce6", published: true,
    entries: [
      { id: "tn-2026-02", year: 2026, date: "2026-08-18", titleKo: "여름방학 방문단 투어", titleEn: "Summer Visitor Tour", subtitleKo: "예지관–창의인재관 순환 경로", subtitleEn: "Yeji–Chang-ui loop route", summaryKo: "가상의 예시 기록입니다. 실제 운영 자료는 관리 화면에서 업로드하세요.", summaryEn: "Fictional sample content. Upload approved operational materials from the management screen.", files: [{ name: "tour-route-checklist.pdf", type: "PDF", size: "1.2 MB" }] },
      { id: "tn-2026-01", year: 2026, date: "2026-05-03", titleKo: "봄 공개 투어 회고", titleEn: "Spring Open Tour Review", subtitleKo: "설명 시간과 이동 간격 점검", subtitleEn: "Timing and movement review", summaryKo: "정류장별 설명 시간을 비교하고 다음 투어를 위한 개선점을 기록했습니다.", summaryEn: "A review of speaking time per stop and improvements for the next tour.", files: [] },
      { id: "tn-2025-01", year: 2025, date: "2025-11-14", titleKo: "국제 방문단 안내", titleEn: "International Delegation Visit", subtitleKo: "한영 투어 운영 예시", subtitleEn: "Bilingual tour operation", summaryKo: "공개 가능한 내용만을 가정해 만든 예시입니다.", summaryEn: "A fictional example containing only publishable information.", files: [{ name: "bilingual-guide.pdf", type: "PDF", size: "840 KB" }] },
    ],
  },
  {
    id: "training", code: "TRAINING", titleKo: "홍보단 교육 자료", titleEn: "Ambassador Training",
    summaryKo: "설명 연습, 응대 원칙, 장소별 핵심 내용을 공유합니다.", summaryEn: "Speaking practice, visitor guidelines, and key points for each stop.",
    accent: "#ff2d8d", published: true,
    entries: [
      { id: "tr-2026-01", year: 2026, date: "2026-03-09", titleKo: "신입 부원 기본 교육", titleEn: "New Member Essentials", subtitleKo: "첫 투어 전 체크리스트", subtitleEn: "Pre-tour checklist", summaryKo: "시선, 속도, 안전한 이동 안내를 연습하는 가상의 교육 기록입니다.", summaryEn: "A fictional training record for eye contact, pacing, and safe movement guidance.", files: [{ name: "ambassador-checklist.pdf", type: "PDF", size: "620 KB" }] },
    ],
  },
  {
    id: "media-kit", code: "MEDIA KIT", titleKo: "공개 홍보 자료", titleEn: "Public Media Kit",
    summaryKo: "승인된 소개문, 로고, 공개용 이미지 자료를 모읍니다.", summaryEn: "Approved descriptions, logos, and public-use image resources.",
    accent: "#0a9c78", published: true, entries: [],
  },
];
