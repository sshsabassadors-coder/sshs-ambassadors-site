"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  createArchiveEntry,
  createTourRoute,
  createTourRouteStop,
  deleteArchiveEntry,
  deleteTourRoute,
  deleteTourRouteStop,
  loadArchiveEntries,
  loadTourNotes,
  loadTourRoutes,
  updateArchiveEntry,
  updateTourRoute,
  updateTourRouteStop,
  type StoredArchiveEntry,
  type StoredTourNote,
  type StoredTourRoute,
  type StoredTourRouteStop,
} from "./contentApi";
import { initialCollections, initialSurveys, type ArchiveCollection, type Survey, type SurveyQuestion } from "./portalData";
import {
  deleteTourStopNote,
  getArchiveCollections,
  getPendingArchiveFiles,
  getSurveyResults,
  getSurveys,
  hasSupabaseConfig,
  insertSurvey,
  patchSurvey,
  removePendingArchiveFile,
  removeSurvey,
  requestPasswordReset,
  setTourStopNotePublished,
  signInWithPassword,
  signOut,
  submitSurveyResponse,
  updatePassword,
  uploadArchiveFile,
  type ArchiveAttachmentRecord,
  type SurveyQuestionRecord,
  type SurveyRecord,
  type SurveyResultRecord,
} from "./supabase";
import { tourStops, type Language, type RouteKey } from "./data";

export type UserSession = { email: string; role: "member" | "admin"; token: string; demo?: boolean };

const text = {
  ko: {
    survey: "방문 경험을 들려주세요", surveyIntro: "게시된 설문에는 로그인 없이 익명으로 참여할 수 있습니다.", result: "Result", start: "설문 시작", closed: "응답 종료", responses: "응답", back: "목록으로",
    required: "필수", submit: "익명으로 제출", submitted: "응답이 제출되었습니다", submittedBody: "소중한 의견을 다음 투어에 반영하겠습니다.",
    archive: "Data Archive", archiveIntro: "홍보단이 함께 사용하는 승인된 활동 자료입니다.", upload: "자료 업로드", year: "연도", files: "첨부 파일", empty: "아직 등록된 기록이 없습니다.",
    login: "부원 로그인", loginIntro: "관리자가 초대한 계정으로 로그인하세요. 공개 회원가입은 제공하지 않습니다.", email: "이메일", password: "비밀번호", signIn: "로그인", reset: "비밀번호 재설정", logout: "로그아웃",
    preview: "설정 전 미리보기", previewBody: "Supabase 연결 전에는 가상 계정으로 권한별 화면을 확인할 수 있습니다.", memberPreview: "Member로 미리보기", adminPreview: "Admin으로 미리보기",
    admin: "Admin Studio", adminIntro: "Tour, Survey, Archive의 공개 상태와 콘텐츠를 한 곳에서 관리합니다.", access: "접근 권한이 필요합니다", accessBody: "이 화면은 로그인한 홍보단 부원만 이용할 수 있습니다.", toLogin: "로그인으로 이동",
  },
  en: {
    survey: "Tell us about your visit", surveyIntro: "Anyone can respond anonymously to a published survey—no sign-in required.", result: "Result", start: "Start survey", closed: "Closed", responses: "responses", back: "Back to list",
    required: "Required", submit: "Submit anonymously", submitted: "Response submitted", submittedBody: "Thank you. We’ll use your feedback to improve the next tour.",
    archive: "Data Archive", archiveIntro: "Approved activity resources shared by the ambassador team.", upload: "Upload resource", year: "Year", files: "Attachments", empty: "No records have been added yet.",
    login: "Member login", loginIntro: "Sign in with an account invited by an administrator. Public sign-up is disabled.", email: "Email", password: "Password", signIn: "Sign in", reset: "Reset password", logout: "Sign out",
    preview: "Setup preview", previewBody: "Before Supabase is connected, use fictional accounts to review role-based screens.", memberPreview: "Preview as Member", adminPreview: "Preview as Admin",
    admin: "Admin Studio", adminIntro: "Manage Tour, Survey, and Archive content and publishing in one place.", access: "Sign-in required", accessBody: "This section is available to signed-in ambassador members.", toLogin: "Go to login",
  },
} as const;

function navigate(route: RouteKey) { window.location.hash = `#/${route}`; }

function PageHero({ label, title, body, action }: { label: string; title: string; body: string; action?: React.ReactNode }) {
  return <section className="portal-hero"><div><p className="eyebrow light">{label}</p><h1>{title}</h1><p>{body}</p></div>{action}</section>;
}

function Gate({ language, admin = false, session }: { language: Language; admin?: boolean; session: UserSession | null }) {
  const t = text[language];
  const denied = !session || (admin && session.role !== "admin");
  if (!denied) return null;
  return (
    <main className="gate-page">
      <div className="gate-mark">↗</div><p className="eyebrow">MEMBER ACCESS</p><h1>{t.access}</h1>
      <p>{admin && session ? "Admin 권한이 있는 계정으로 다시 로그인하세요." : t.accessBody}</p>
      <button className="portal-primary" onClick={() => navigate("login")}>{t.toLogin}<span>→</span></button>
    </main>
  );
}

function scaleQuestion(label: string, id: string, value: unknown, setAnswer: (id: string, value: unknown) => void, required: boolean) {
  return (
    <fieldset className="question-field"><legend>{label}{required && <em>*</em>}</legend><div className="scale-row">
      {[1, 2, 3, 4, 5].map((score) => <label key={score} className={value === score ? "selected" : ""}><input type="radio" name={id} value={score} checked={value === score} onChange={() => setAnswer(id, score)} required={required} /><span>{score}</span></label>)}
    </div><div className="scale-labels"><span>Not yet</span><span>Excellent</span></div></fieldset>
  );
}

function surveyFromRecord(record: SurveyRecord): Survey {
  const date = record.opens_at || record.created_at;
  return {
    id: record.id,
    number: record.survey_number,
    titleKo: record.title_ko,
    titleEn: record.title_en,
    descriptionKo: record.description_ko,
    descriptionEn: record.description_en,
    date: date.slice(0, 10),
    status: record.status,
    questions: record.survey_questions.map((question) => ({
      id: question.question_key,
      labelKo: question.label_ko,
      labelEn: question.label_en,
      type: question.question_type,
      required: question.is_required,
      options: Array.isArray(question.options) ? question.options.filter((item): item is string => typeof item === "string") : undefined,
      showWhen: question.condition_question_key && question.condition_equals ? { questionId: question.condition_question_key, equals: question.condition_equals } : undefined,
    })),
  };
}

export function SurveyPage({ language, session }: { language: Language; session: UserSession | null }) {
  const t = text[language];
  const i = language === "ko" ? 0 : 1;
  const [surveys, setSurveys] = useState<Survey[]>(hasSupabaseConfig ? [] : initialSurveys);
  const [mode, setMode] = useState<"list" | "form" | "result" | "thanks">("list");
  const [selected, setSelected] = useState<Survey | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [resultRows, setResultRows] = useState<SurveyResultRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(hasSupabaseConfig);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    let active = true;
    getSurveys().then((rows) => {
      if (!active) return;
      const mapped = rows.map(surveyFromRecord);
      setSurveys(mapped);
      setOpenId(mapped[0]?.id || null);
      setSelected((current) => mapped.find((item) => item.id === current?.id) || mapped[0] || null);
    }).catch((cause) => active && setError(cause instanceof Error ? cause.message : "Could not load surveys.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (mode !== "result" || !selected || !session || session.demo) return;
    let active = true;
    getSurveyResults(selected.id).then((rows) => active && setResultRows(rows)).catch((cause) => active && setError(cause instanceof Error ? cause.message : "Could not load results."));
    return () => { active = false; };
  }, [mode, selected, session]);

  const setAnswer = (id: string, value: unknown) => setAnswers((current) => ({ ...current, [id]: value }));
  const startSurvey = (survey: Survey) => { setSelected(survey); setAnswers({}); setMode("form"); window.scrollTo(0, 0); };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setError("");
    const visible = selected.questions.filter((question) => !question.showWhen || answers[question.showWhen.questionId] === question.showWhen.equals);
    if (visible.some((question) => question.required && (answers[question.id] === undefined || answers[question.id] === ""))) {
      setError(language === "ko" ? "필수 문항에 모두 응답해 주세요." : "Please answer every required question.");
      return;
    }
    try { setSubmitting(true); await submitSurveyResponse(selected.id, answers); setMode("thanks"); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Submission failed"); }
    finally { setSubmitting(false); }
  };

  const filteredRows = filter === "all" ? resultRows : resultRows.filter((row) => row.language === filter);
  const average = (key: "satisfaction" | "knowledge" | "english") => {
    const values = filteredRows.map((row) => row[key]).filter((value): value is number => typeof value === "number");
    return values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : "—";
  };
  const downloadCsv = () => {
    const header = "id,submitted_at,satisfaction,language,english,knowledge,comment\n";
    const rows = filteredRows.map((row) => [row.id, row.submittedAt, row.satisfaction ?? "", row.language, row.english ?? "", row.knowledge ?? "", `"${row.comment.replaceAll('"', '""')}"`].join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([header + rows], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "survey-results.csv"; link.click(); URL.revokeObjectURL(url);
  };

  if (mode === "form" && selected) return (
    <main className="survey-form-page">
      <button className="back-link" onClick={() => setMode("list")}>← {t.back}</button>
      <div className="form-heading"><p className="eyebrow">SURVEY {String(selected.number).padStart(2, "0")}</p><h1>{i === 0 ? selected.titleKo : selected.titleEn}</h1><p>{i === 0 ? selected.descriptionKo : selected.descriptionEn}</p></div>
      <form className="survey-form" onSubmit={submit}>
        {selected.questions.map((question, index) => {
          if (question.showWhen && answers[question.showWhen.questionId] !== question.showWhen.equals) return null;
          const label = i === 0 ? question.labelKo : question.labelEn;
          return <div className="question-block" key={question.id}><span className="question-index">{String(index + 1).padStart(2, "0")}</span>
            {question.type === "scale" ? scaleQuestion(label, question.id, answers[question.id], setAnswer, question.required) : question.type === "single" ? (
              <fieldset className="question-field"><legend>{label}{question.required && <em>*</em>}</legend><div className="choice-row">{question.options?.map((option) => <label key={option} className={answers[question.id] === option ? "selected" : ""}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswer(question.id, option)} required={question.required} /><span>{option}</span></label>)}</div></fieldset>
            ) : <label className="question-field"><strong>{label}</strong><textarea value={String(answers[question.id] ?? "")} onChange={(event) => setAnswer(question.id, event.target.value)} maxLength={2000} rows={5} placeholder={language === "ko" ? "의견을 자유롭게 남겨주세요." : "Share your thoughts."} required={question.required} /></label>}
          </div>;
        })}
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="portal-primary wide" disabled={submitting}>{submitting ? "Submitting…" : t.submit}<span>→</span></button>
      </form>
    </main>
  );

  if (mode === "thanks") return <main className="thanks-page"><div className="thanks-orbit">✓</div><p className="eyebrow">THANK YOU</p><h1>{t.submitted}</h1><p>{t.submittedBody}</p><button className="portal-primary" onClick={() => setMode("list")}>{t.back}<span>→</span></button></main>;

  if (mode === "result") {
    if (!session) return <Gate language={language} session={session} />;
    return (
      <main className="results-page">
        <PageHero label="SURVEY ANALYTICS" title={language === "ko" ? "설문 결과" : "Survey results"} body={language === "ko" ? "응답 분포와 자유 의견을 한 화면에서 확인합니다." : "Review response distribution and written feedback in one place."} action={<button className="outline-action" onClick={() => setMode("list")}>← {t.back}</button>} />
        <div className="result-toolbar"><select value={selected?.id || ""} onChange={(event) => setSelected(surveys.find((item) => item.id === event.target.value) || null)} aria-label="Survey">{surveys.map((survey) => <option key={survey.id} value={survey.id}>Survey {String(survey.number).padStart(2, "0")} — {i === 0 ? survey.titleKo : survey.titleEn}</option>)}</select><select value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Language filter"><option value="all">All languages</option><option value="한국어">한국어</option><option value="English">English</option></select><button onClick={downloadCsv}>CSV ↓</button></div>
        {error && <p className="form-error portal-inline-error">{error}</p>}
        <section className="metric-grid"><article><span>TOTAL</span><strong>{filteredRows.length}</strong><small>{t.responses}</small></article><article><span>SATISFACTION</span><strong>{average("satisfaction")}</strong><small>/ 5.0</small></article><article><span>KNOWLEDGE</span><strong>{average("knowledge")}</strong><small>/ 5.0</small></article><article><span>ENGLISH</span><strong>{average("english")}</strong><small>/ 5.0</small></article></section>
        <section className="result-grid"><article className="chart-card"><div className="card-title"><p className="eyebrow">DISTRIBUTION</p><h2>{language === "ko" ? "만족도 분포" : "Satisfaction distribution"}</h2></div><div className="bar-chart">{[5, 4, 3, 2, 1].map((score) => { const count = filteredRows.filter((row) => row.satisfaction === score).length; return <div key={score}><span>{score}</span><i><b style={{ width: `${filteredRows.length ? count / filteredRows.length * 100 : 0}%` }} /></i><strong>{count}</strong></div>; })}</div></article><article className="comments-card"><div className="card-title"><p className="eyebrow">COMMENTS</p><h2>{language === "ko" ? "최근 자유 의견" : "Recent comments"}</h2></div>{filteredRows.filter((row) => row.comment).slice(0, 3).map((row) => <blockquote key={row.id}><p>“{row.comment}”</p><footer>{row.id} · {row.submittedAt}</footer></blockquote>)}</article></section>
        <section className="response-table-wrap"><div className="card-title"><p className="eyebrow">RAW RESPONSES</p><h2>{language === "ko" ? "응답표" : "Response table"}</h2></div><div className="table-scroll"><table><thead><tr><th>ID</th><th>Date</th><th>Satisfaction</th><th>Language</th><th>English</th><th>Knowledge</th><th>Comment</th></tr></thead><tbody>{filteredRows.map((row) => <tr key={row.id}><th>{row.id}</th><td>{row.submittedAt}</td><td>{row.satisfaction ?? "—"}</td><td>{row.language}</td><td>{row.english ?? "—"}</td><td>{row.knowledge ?? "—"}</td><td>{row.comment}</td></tr>)}</tbody></table></div></section>
      </main>
    );
  }

  return (
    <main className="survey-list-page">
      <PageHero label="VISITOR FEEDBACK" title={t.survey} body={t.surveyIntro} action={session && surveys.length > 0 ? <button className="portal-accent" onClick={() => { setSelected((current) => current || surveys[0]); setMode("result"); }}>{t.result}<span>↗</span></button> : undefined} />
      {error && <p className="form-error portal-inline-error">{error}</p>}
      <section className="survey-list">{loading ? <div className="empty-state"><p>{language === "ko" ? "설문을 불러오는 중입니다…" : "Loading surveys…"}</p></div> : surveys.length === 0 ? <div className="empty-state">∅<p>{language === "ko" ? "게시된 설문이 없습니다." : "There are no published surveys."}</p></div> : surveys.map((survey) => { const open = openId === survey.id; return <article key={survey.id} className={open ? "survey-item open" : "survey-item"}>
        <button className="survey-summary" onClick={() => setOpenId(open ? null : survey.id)} aria-expanded={open}><span className="survey-index">{String(survey.number).padStart(2, "0")}</span><span><small>SURVEY {survey.number} · {survey.date}</small><strong>{i === 0 ? survey.titleKo : survey.titleEn}</strong></span><em>{survey.status === "published" ? "OPEN" : "CLOSED"}</em><b>{open ? "−" : "+"}</b></button>
        {open && <div className="survey-detail"><p>{i === 0 ? survey.descriptionKo : survey.descriptionEn}</p><button disabled={survey.status !== "published"} onClick={() => startSurvey(survey)}>{survey.status === "published" ? t.start : t.closed}<span>→</span></button></div>}
      </article>; })}</section>
    </main>
  );
}

function collectionFromRecord(collection: Awaited<ReturnType<typeof getArchiveCollections>>[number]): ArchiveCollection {
  return {
    id: collection.id,
    code: collection.slug.replaceAll("-", " ").toUpperCase(),
    titleKo: collection.title_ko,
    titleEn: collection.title_en,
    summaryKo: collection.summary_ko,
    summaryEn: collection.summary_en,
    accent: collection.accent_color,
    published: collection.is_published,
    entries: collection.archive_entries.map((entry) => ({
      id: entry.id,
      year: entry.year,
      date: entry.entry_date,
      titleKo: entry.title_ko,
      titleEn: entry.title_en,
      subtitleKo: entry.subtitle_ko,
      subtitleEn: entry.subtitle_en,
      summaryKo: entry.summary_ko,
      summaryEn: entry.summary_en,
      files: entry.archive_attachments.map((file) => ({ name: file.original_name, type: file.mime_type.split("/").pop()?.toUpperCase() || "FILE", size: `${(file.size_bytes / 1024 / 1024).toFixed(1)} MB`, url: file.signed_url })),
    })),
  };
}

export function DataPage({ language, session }: { language: Language; session: UserSession | null }) {
  const t = text[language]; const i = language === "ko" ? 0 : 1;
  const [collections, setCollections] = useState<ArchiveCollection[]>(hasSupabaseConfig ? [] : initialCollections);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [year, setYear] = useState<number | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [error, setError] = useState("");
  const [uploadState, setUploadState] = useState<{ name: string; progress: number; message: string } | null>(null);
  const selected = collections.find((collection) => collection.id === selectedId) || null;

  const refresh = async () => {
    if (!hasSupabaseConfig) return;
    const rows = await getArchiveCollections();
    setCollections(rows.map(collectionFromRecord));
  };
  useEffect(() => {
    if (!session || !hasSupabaseConfig) return;
    let active = true;
    getArchiveCollections()
      .then((rows) => { if (active) setCollections(rows.map(collectionFromRecord)); })
      .catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load the archive."); });
    return () => { active = false; };
  }, [session]);
  if (!session) return <Gate language={language} session={session} />;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowed.includes(file.type) || file.size > 25 * 1024 * 1024) { setUploadState({ name: file.name, progress: 0, message: language === "ko" ? "지원 형식과 25MB 제한을 확인하세요." : "Check the file type and 25 MB limit." }); return; }
    setUploadState({ name: file.name, progress: 8, message: "" });
    try {
      await uploadArchiveFile(file, expanded, (progress) => setUploadState({ name: file.name, progress, message: "" }));
      setUploadState({ name: file.name, progress: 100, message: language === "ko" ? "업로드가 완료되었습니다." : "Upload complete." });
      await refresh();
    } catch (cause) { setUploadState({ name: file.name, progress: 0, message: cause instanceof Error ? cause.message : "Upload failed" }); }
  };

  if (!selected) return (
    <main className="archive-page"><PageHero label="MEMBER LIBRARY" title={t.archive} body={t.archiveIntro} action={<button className="portal-accent" onClick={() => setUploadOpen(true)}>{t.upload}<span>＋</span></button>} />
      {error && <p className="form-error portal-inline-error">{error}</p>}
      <section className="collection-grid">{collections.length === 0 ? <div className="empty-state">∅<p>{t.empty}</p></div> : collections.map((collection, index) => <button key={collection.id} className="collection-card" onClick={() => setSelectedId(collection.id)} style={{ "--accent": collection.accent } as React.CSSProperties}><span className="collection-code">{collection.code}</span><b>0{index + 1}</b><div className="collection-symbol">{index === 0 ? "⌁" : index === 1 ? "◫" : "✦"}</div><h2>{i === 0 ? collection.titleKo : collection.titleEn}</h2><p>{i === 0 ? collection.summaryKo : collection.summaryEn}</p><footer><span>{collection.entries.length} records</span><em>→</em></footer></button>)}</section>
      {uploadOpen && <UploadDialog language={language} state={uploadState} onFile={upload} onClose={() => setUploadOpen(false)} />}
    </main>
  );

  const years = Array.from(new Set(selected.entries.map((entry) => entry.year))).sort((a, b) => b - a);
  const entries = year === "all" ? selected.entries : selected.entries.filter((entry) => entry.year === year);
  return (
    <main className="archive-detail-page"><button className="back-link" onClick={() => { setSelectedId(null); setYear("all"); setExpanded(null); }}>← {t.archive}</button>
      <div className="archive-heading" style={{ "--accent": selected.accent } as React.CSSProperties}><p className="eyebrow">{selected.code}</p><h1>{i === 0 ? selected.titleKo : selected.titleEn}</h1><p>{i === 0 ? selected.summaryKo : selected.summaryEn}</p><button className="portal-accent" onClick={() => setUploadOpen(true)}>{t.upload}<span>＋</span></button></div>
      <div className="year-tabs"><span>{t.year}</span><button className={year === "all" ? "active" : ""} onClick={() => setYear("all")}>ALL</button>{years.map((item) => <button key={item} className={year === item ? "active" : ""} onClick={() => setYear(item)}>{item}</button>)}</div>
      <section className="entry-list">{entries.length === 0 ? <div className="empty-state">∅<p>{t.empty}</p></div> : entries.map((entry) => <article key={entry.id} className={expanded === entry.id ? "entry-item open" : "entry-item"}><button onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}><time>{entry.date}</time><span><small>{i === 0 ? entry.subtitleKo : entry.subtitleEn}</small><strong>{i === 0 ? entry.titleKo : entry.titleEn}</strong></span><b>{expanded === entry.id ? "−" : "+"}</b></button>{expanded === entry.id && <div className="entry-body"><p>{i === 0 ? entry.summaryKo : entry.summaryEn}</p><h3>{t.files}</h3>{entry.files.length ? entry.files.map((file) => <div className="file-row" key={file.name}><i>{file.type}</i><span><strong>{file.name}</strong><small>{file.size}</small></span><button aria-label={`Download ${file.name}`} disabled={!file.url} onClick={() => file.url && window.open(file.url, "_blank", "noopener,noreferrer")}>↓</button></div>) : <p className="muted">No attachments</p>}</div>}</article>)}</section>
      {uploadOpen && <UploadDialog language={language} state={uploadState} onFile={upload} onClose={() => setUploadOpen(false)} />}
    </main>
  );
}

function UploadDialog({ language, state, onFile, onClose }: { language: Language; state: { name: string; progress: number; message: string } | null; onFile: (file: File | undefined) => void; onClose: () => void }) {
  return <div className="upload-modal" role="dialog" aria-modal="true" aria-label="Upload resource"><div className="upload-card"><button className="upload-close" onClick={onClose}>×</button><p className="eyebrow">MEMBER UPLOAD</p><h2>{language === "ko" ? "새 자료 업로드" : "Upload a resource"}</h2><p>{language === "ko" ? "PDF, PPTX, DOCX, XLSX · 파일당 최대 25MB" : "PDF, PPTX, DOCX, XLSX · Up to 25 MB each"}</p><label className="drop-zone"><input type="file" accept=".pdf,.pptx,.docx,.xlsx" onChange={(event) => onFile(event.target.files?.[0])} /><span>＋</span><strong>{language === "ko" ? "파일 선택" : "Choose a file"}</strong></label>{state && <div className="upload-progress"><div><span>{state.name}</span><b>{state.progress}%</b></div><i><em style={{ width: `${state.progress}%` }} /></i>{state.message && <p>{state.message}</p>}</div>}</div></div>;
}

export function LoginPage({ language, session, setSession, recoveryMode = false, onRecoveryComplete }: { language: Language; session: UserSession | null; setSession: (session: UserSession | null) => void; recoveryMode?: boolean; onRecoveryComplete?: () => void }) {
  const t = text[language];
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [loading, setLoading] = useState(false);
  const signIn = async (event: FormEvent) => { event.preventDefault(); setError(""); try { setLoading(true); const auth = await signInWithPassword(email, password); setSession({ email: auth.email, role: auth.role, token: auth.accessToken }); navigate("data"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Login failed"); } finally { setLoading(false); } };
  const reset = async () => { if (!email) { setError(language === "ko" ? "이메일을 먼저 입력하세요." : "Enter your email first."); return; } try { setError(""); await requestPasswordReset(email, `${window.location.origin}${window.location.pathname}`); setNotice(language === "ko" ? "재설정 메일을 확인하세요." : "Check your email for the reset link."); } catch (cause) { setError(cause instanceof Error ? cause.message : "Reset failed"); } };
  const savePassword = async (event: FormEvent) => { event.preventDefault(); if (password.length < 8) { setError(language === "ko" ? "비밀번호는 8자 이상으로 입력하세요." : "Use at least 8 characters."); return; } if (password !== confirmPassword) { setError(language === "ko" ? "두 비밀번호가 일치하지 않습니다." : "The passwords do not match."); return; } try { setLoading(true); setError(""); await updatePassword(password); setNotice(language === "ko" ? "새 비밀번호가 저장되었습니다." : "Your new password has been saved."); onRecoveryComplete?.(); navigate("data"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not update the password."); } finally { setLoading(false); } };

  if (recoveryMode) return <main className="login-page"><div className="login-visual"><div className="login-grid" /><p>SSHS AMBASSADORS</p><h1>Reset<br />access.</h1><span>SECURE PASSWORD UPDATE</span></div><div className="login-panel"><p className="eyebrow">PASSWORD RECOVERY</p><h2>{language === "ko" ? "새 비밀번호 설정" : "Choose a new password"}</h2><p>{language === "ko" ? "8자 이상의 새 비밀번호를 두 번 입력하세요." : "Enter the same new password twice."}</p><form onSubmit={savePassword}><label>{language === "ko" ? "새 비밀번호" : "New password"}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required minLength={8} /></label><label>{language === "ko" ? "비밀번호 확인" : "Confirm password"}<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required minLength={8} /></label>{error && <p className="form-error">{error}</p>}{notice && <p className="form-notice">{notice}</p>}<button className="portal-primary wide" disabled={loading}>{loading ? "Saving…" : language === "ko" ? "새 비밀번호 저장" : "Save new password"}<span>→</span></button></form></div></main>;
  if (session) return <main className="login-page"><div className="login-visual"><p>SSHS AMBASSADORS</p><h1>Welcome<br />back.</h1><span>{session.role.toUpperCase()} ACCESS</span></div><div className="login-panel"><p className="eyebrow">SIGNED IN</p><h2>{session.email}</h2><p>{session.role} account</p><button className="portal-primary wide" onClick={() => { signOut().catch(() => undefined); setSession(null); navigate("intro"); }}>{t.logout}<span>→</span></button></div></main>;
  return <main className="login-page"><div className="login-visual"><div className="login-grid" /><p>SSHS AMBASSADORS</p><h1>Inside<br />the team.</h1><span>MEMBER SPACE · PRIVATE ARCHIVE</span></div><div className="login-panel"><p className="eyebrow">MEMBER ACCESS</p><h2>{t.login}</h2><p>{t.loginIntro}</p>{hasSupabaseConfig ? <form onSubmit={signIn}><label>{t.email}<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label><label>{t.password}<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required autoComplete="current-password" /></label>{error && <p className="form-error">{error}</p>}{notice && <p className="form-notice">{notice}</p>}<button className="portal-primary wide" disabled={loading}>{loading ? "Signing in…" : t.signIn}<span>→</span></button><button type="button" className="reset-link" onClick={reset}>{t.reset}</button></form> : <div className="preview-login"><div className="preview-note"><strong>{t.preview}</strong><p>{t.previewBody}</p></div><button onClick={() => { setSession({ email: "member@example.test", role: "member", token: "demo-member", demo: true }); navigate("data"); }}>{t.memberPreview}<span>→</span></button><button onClick={() => { setSession({ email: "admin@example.test", role: "admin", token: "demo-admin", demo: true }); navigate("admin"); }}>{t.adminPreview}<span>→</span></button></div>}</div></main>;
}

type Editor = { index: number; titleKo: string; titleEn: string; published: boolean; stopSlug: string };
type ArchiveDraft = { id?: string; collectionId: string; year: number; titleKo: string; titleEn: string; summaryKo: string; summaryEn: string; file?: File };

function defaultQuestionRecords(questions: SurveyQuestion[]): Array<Omit<SurveyQuestionRecord, "id" | "survey_id">> {
  return questions.map((question, index) => ({
    question_key: question.id,
    label_ko: question.labelKo,
    label_en: question.labelEn,
    question_type: question.type,
    is_required: question.required,
    options: question.options || [],
    condition_question_key: question.showWhen?.questionId || null,
    condition_equals: question.showWhen?.equals || null,
    sort_order: index,
  }));
}

export function AdminPage({ language, session }: { language: Language; session: UserSession | null }) {
  const t = text[language]; const i = language === "ko" ? 0 : 1;
  const fallbackRoute: StoredTourRoute = { id: "tour-1", name: "Tour 1", color: "#ff2d8d", sort_index: 1, is_published: true, stops: tourStops.map((stop, index) => ({ id: `fallback-${stop.id}`, route_id: "tour-1", stop_slug: stop.id, title_ko: stop.name[0], title_en: stop.name[1], published: true, sort_index: index + 1 })) };
  const [tab, setTab] = useState("tour-1");
  const [routes, setRoutes] = useState<StoredTourRoute[]>(hasSupabaseConfig ? [] : [fallbackRoute]);
  const [surveys, setSurveys] = useState<Survey[]>(hasSupabaseConfig ? [] : initialSurveys);
  const [archiveRows, setArchiveRows] = useState<StoredArchiveEntry[]>([]);
  const [collectionOptions, setCollectionOptions] = useState<Array<{ id: string; title: string }>>(
    hasSupabaseConfig ? [] : initialCollections.map((collection) => ({ id: collection.id, title: language === "ko" ? collection.titleKo : collection.titleEn })),
  );
  const [pendingFiles, setPendingFiles] = useState<ArchiveAttachmentRecord[]>([]);
  const [routeNotes, setRouteNotes] = useState<StoredTourNote[]>([]);
  const [archiveDraft, setArchiveDraft] = useState<ArchiveDraft | null>(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const isTour = tab.startsWith("tour-");
  const currentRoute = routes.find((route) => route.id === tab) || routes[0] || fallbackRoute;
  const currentRows = currentRoute.stops;

  const saved = (message?: string) => { setToast(message || (language === "ko" ? "변경 사항을 저장했습니다." : "Changes saved.")); window.setTimeout(() => setToast(""), 2200); };
  const fail = (cause: unknown) => setError(cause instanceof Error ? cause.message : "The operation failed.");
  const refreshArchive = async () => {
    const [{ items, collections }, pending] = await Promise.all([loadArchiveEntries(), getPendingArchiveFiles()]);
    setArchiveRows(items);
    setCollectionOptions(collections.map((collection) => ({ id: collection.id, title: language === "ko" ? collection.title_ko : collection.title_en })));
    setPendingFiles(pending);
  };
  const refreshAll = async () => {
    const [routeData, surveyData] = await Promise.all([loadTourRoutes(), getSurveys()]);
    setRoutes(routeData.items);
    setSurveys(surveyData.map(surveyFromRecord));
    if (routeData.items.length) setTab((current) => routeData.items.some((route) => route.id === current) ? current : routeData.items[0].id);
    await refreshArchive();
  };

  useEffect(() => {
    if (!session || session.role !== "admin" || session.demo) return;
    const timer = window.setTimeout(() => refreshAll().catch(fail), 0);
    return () => window.clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!session || !isTour || !currentRoute.stops.length || session.demo) return;
    let active = true;
    Promise.all(currentRoute.stops.map((stop) => loadTourNotes(currentRoute.id, stop.stop_slug, session.token).then(({ items }) => items))).then((groups) => active && setRouteNotes(groups.flat())).catch(fail);
    return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRoute.id, currentRoute.stops.length, isTour, session]);

  if (!session || session.role !== "admin") return <Gate language={language} session={session} admin />;

  const addRoute = async () => {
    try {
      const number = Math.max(0, ...routes.map((route) => route.sort_index)) + 1;
      const item = session.demo ? { ...fallbackRoute, id: `tour-${number}`, name: `Tour ${number}`, sort_index: number, color: ["#005ce6", "#16a085", "#f39c12", "#8e44ad"][number % 4], stops: [] } : (await createTourRoute(`Tour ${number}`, ["#005ce6", "#16a085", "#f39c12", "#8e44ad"][number % 4], number)).item;
      setRoutes((items) => [...items, item].sort((a, b) => a.sort_index - b.sort_index)); setTab(item.id); saved(language === "ko" ? `${item.name}을 생성했습니다.` : `${item.name} created.`);
    } catch (cause) { fail(cause); }
  };
  const removeRoute = async () => {
    if (routes.length <= 1 || !window.confirm(language === "ko" ? "이 투어 루트와 항목을 모두 삭제할까요?" : "Delete this route and all of its stops?")) return;
    try { if (!session.demo) await deleteTourRoute(currentRoute.id); const next = routes.filter((route) => route.id !== currentRoute.id); setRoutes(next); setTab(next[0].id); saved(); } catch (cause) { fail(cause); }
  };
  const setRouteColor = async (color: string) => {
    setRoutes((items) => items.map((item) => item.id === currentRoute.id ? { ...item, color } : item));
    if (!session.demo) updateTourRoute(currentRoute.id, { color }).catch(fail);
  };
  const openEditor = (index: number) => {
    if (isTour) {
      const existing = currentRows[index];
      const available = tourStops.find((stop) => !currentRows.some((row) => row.stop_slug === stop.id));
      if (!existing && !available) { setError(language === "ko" ? "이 루트에는 12개 지도 위치가 모두 들어 있습니다." : "This route already contains all 12 map locations."); return; }
      setEditor(existing ? { index, titleKo: existing.title_ko, titleEn: existing.title_en, published: existing.published, stopSlug: existing.stop_slug } : { index: -1, titleKo: available?.name[0] || "", titleEn: available?.name[1] || "", published: false, stopSlug: available?.id || tourStops[0].id });
    } else if (tab === "survey") {
      const survey = surveys[index];
      setEditor(survey ? { index, titleKo: survey.titleKo, titleEn: survey.titleEn, published: survey.status === "published", stopSlug: "" } : { index: -1, titleKo: "", titleEn: "", published: false, stopSlug: "" });
    }
  };
  const chooseStop = (slug: string) => {
    if (!editor) return;
    const stop = tourStops.find((item) => item.id === slug);
    setEditor({ ...editor, stopSlug: slug, titleKo: stop?.name[0] || editor.titleKo, titleEn: stop?.name[1] || editor.titleEn });
  };
  const saveEditor = async () => {
    if (!editor || !editor.titleKo.trim() || !editor.titleEn.trim()) return;
    try {
      if (isTour) {
        if (editor.index < 0) {
          const input: Omit<StoredTourRouteStop, "id"> = { route_id: currentRoute.id, stop_slug: editor.stopSlug, title_ko: editor.titleKo.trim(), title_en: editor.titleEn.trim(), published: editor.published, sort_index: Math.max(0, ...currentRows.map((item) => item.sort_index)) + 1 };
          const item = session.demo ? { ...input, id: `preview-${Date.now()}` } : (await createTourRouteStop(input)).item;
          setRoutes((all) => all.map((route) => route.id === currentRoute.id ? { ...route, stops: [...route.stops, item] } : route));
        } else {
          const original = currentRows[editor.index];
          if (!session.demo) await updateTourRouteStop(original.id, { stop_slug: editor.stopSlug, title_ko: editor.titleKo.trim(), title_en: editor.titleEn.trim(), published: editor.published });
          setRoutes((all) => all.map((route) => route.id === currentRoute.id ? { ...route, stops: route.stops.map((item) => item.id === original.id ? { ...item, stop_slug: editor.stopSlug, title_ko: editor.titleKo.trim(), title_en: editor.titleEn.trim(), published: editor.published } : item) } : route));
        }
      } else if (tab === "survey") {
        if (editor.index < 0) {
          if (session.demo) setSurveys((items) => [...items, { ...initialSurveys[0], id: `draft-${Date.now()}`, number: items.length + 1, titleKo: editor.titleKo, titleEn: editor.titleEn, status: editor.published ? "published" : "draft" }]);
          else { await insertSurvey({ number: Math.max(0, ...surveys.map((survey) => survey.number)) + 1, titleKo: editor.titleKo.trim(), titleEn: editor.titleEn.trim(), descriptionKo: "방문 경험을 알려주세요.", descriptionEn: "Tell us about your visit.", status: editor.published ? "published" : "draft", questions: defaultQuestionRecords(initialSurveys[0].questions) }); setSurveys((await getSurveys()).map(surveyFromRecord)); }
        } else {
          const survey = surveys[editor.index];
          if (!session.demo) await patchSurvey(survey.id, { title_ko: editor.titleKo.trim(), title_en: editor.titleEn.trim(), status: editor.published ? "published" : "draft" });
          setSurveys((items) => items.map((item) => item.id === survey.id ? { ...item, titleKo: editor.titleKo.trim(), titleEn: editor.titleEn.trim(), status: editor.published ? "published" : "draft" } : item));
        }
      }
      setEditor(null); setError(""); saved();
    } catch (cause) { fail(cause); }
  };
  const deleteEditor = async () => {
    if (!editor || editor.index < 0 || !window.confirm(language === "ko" ? "정말 삭제할까요?" : "Delete this item?")) return;
    try {
      if (isTour) { const row = currentRows[editor.index]; if (!session.demo) await deleteTourRouteStop(row.id); setRoutes((all) => all.map((route) => route.id === currentRoute.id ? { ...route, stops: route.stops.filter((item) => item.id !== row.id) } : route)); }
      if (tab === "survey") { const survey = surveys[editor.index]; if (!session.demo) await removeSurvey(survey.id); setSurveys((items) => items.filter((item) => item.id !== survey.id)); }
      setEditor(null); saved();
    } catch (cause) { fail(cause); }
  };
  const toggleSurvey = async (survey: Survey) => {
    const status = survey.status === "published" ? "draft" : "published";
    try { if (!session.demo) await patchSurvey(survey.id, { status }); setSurveys((items) => items.map((item) => item.id === survey.id ? { ...item, status } : item)); } catch (cause) { fail(cause); }
  };
  const openArchive = (item?: StoredArchiveEntry) => setArchiveDraft(item ? { id: item.id, collectionId: item.collection_id, year: item.year, titleKo: item.title_ko, titleEn: item.title_en, summaryKo: item.summary_ko, summaryEn: item.summary_en } : { collectionId: collectionOptions[0]?.id || "", year: new Date().getFullYear(), titleKo: "", titleEn: "", summaryKo: "", summaryEn: "" });
  const saveArchive = async (event: FormEvent) => {
    event.preventDefault(); if (!archiveDraft) return;
    try {
      if (session.demo) {
        const preview: StoredArchiveEntry = { id: archiveDraft.id || `preview-${Date.now()}`, collection_id: archiveDraft.collectionId, year: archiveDraft.year, date: `${archiveDraft.year}-01-01`, title_ko: archiveDraft.titleKo, title_en: archiveDraft.titleEn, summary_ko: archiveDraft.summaryKo, summary_en: archiveDraft.summaryEn, file_url: null, file_name: archiveDraft.file?.name || null, file_type: archiveDraft.file?.type || null, file_size: archiveDraft.file?.size || null, is_published: true };
        setArchiveRows((items) => archiveDraft.id ? items.map((item) => item.id === archiveDraft.id ? preview : item) : [preview, ...items]);
      } else {
        if (archiveDraft.id) await updateArchiveEntry(archiveDraft.id, archiveDraft);
        else await createArchiveEntry(archiveDraft);
        await refreshArchive();
      }
      setArchiveDraft(null); saved(language === "ko" ? "아카이브 콘텐츠를 저장했습니다." : "Archive content saved.");
    } catch (cause) { fail(cause); }
  };
  const removeArchive = async (item: StoredArchiveEntry) => {
    if (!window.confirm(language === "ko" ? "이 콘텐츠와 첨부 파일을 삭제할까요?" : "Delete this content and its attachments?")) return;
    try { if (session.demo) setArchiveRows((items) => items.filter((entry) => entry.id !== item.id)); else { await deleteArchiveEntry(item.id); await refreshArchive(); } saved(); } catch (cause) { fail(cause); }
  };
  const moderateNote = async (note: StoredTourNote, action: "publish" | "delete") => {
    try {
      if (action === "delete") { if (!window.confirm(language === "ko" ? "이 설명과 사진을 삭제할까요?" : "Delete this note and its photos?")) return; await deleteTourStopNote(note.id); setRouteNotes((items) => items.filter((item) => item.id !== note.id)); }
      else { await setTourStopNotePublished(note.id, !note.is_published); setRouteNotes((items) => items.map((item) => item.id === note.id ? { ...item, is_published: !item.is_published } : item)); }
      saved();
    } catch (cause) { fail(cause); }
  };

  return <main className="admin-page"><PageHero label="CONTENT MANAGEMENT" title={t.admin} body={t.adminIntro} action={<div className="admin-user"><span>ADMIN</span><strong>{session.email}</strong></div>} />
    {error && <p className="form-error portal-inline-error" role="alert">{error}</p>}
    <div className="admin-tabs">{routes.map((route) => <button key={route.id} className={tab === route.id ? "active" : ""} style={{ "--tour-color": route.color } as React.CSSProperties} onClick={() => setTab(route.id)}>{route.name} <span>{route.stops.length}</span></button>)}<button className={tab === "survey" ? "active" : ""} onClick={() => setTab("survey")}>Survey <span>{surveys.length}</span></button><button className={tab === "archive" ? "active" : ""} onClick={() => setTab("archive")}>Archive <span>{archiveRows.length}</span></button><button className="add-tour-tab" onClick={addRoute} aria-label={language === "ko" ? "새 투어 루트 추가" : "Add tour route"}>＋</button></div>
    <section className="admin-workspace"><div className="workspace-heading"><div><p className="eyebrow">{isTour ? currentRoute.name.toUpperCase() : tab.toUpperCase()} CONTENT</p><h2>{isTour ? language === "ko" ? "투어 장소 관리" : "Tour stops" : tab === "survey" ? language === "ko" ? "설문 관리" : "Surveys" : language === "ko" ? "아카이브 콘텐츠 관리" : "Archive content"}</h2>{isTour && <label className="route-color-control"><span>{language === "ko" ? "루트 색상" : "Route color"}</span><input type="color" value={currentRoute.color} onChange={(event) => setRouteColor(event.target.value)} /><b>{currentRoute.color}</b>{routes.length > 1 && <button type="button" className="route-delete-link" onClick={removeRoute}>{language === "ko" ? "루트 삭제" : "Delete route"}</button>}</label>}</div><button className="portal-accent" onClick={() => tab === "archive" ? openArchive() : openEditor(-1)}>＋ {tab === "archive" ? language === "ko" ? "새 콘텐츠" : "New content" : language === "ko" ? "새 항목" : "New item"}</button></div>
      {isTour && <><div className="admin-table" style={{ "--route-accent": currentRoute.color } as React.CSSProperties}><div className="admin-row table-head"><span>ORDER</span><span>NAME</span><span>STATUS</span><span>LOCATION</span><span /></div>{currentRows.length ? currentRows.map((item, index) => <div className="admin-row" key={item.id}><span className="drag">⠿ {String(index + 1).padStart(2, "0")}</span><span><strong>{i === 0 ? item.title_ko : item.title_en}</strong><small>{i === 0 ? item.title_en : item.title_ko}</small></span><span>{item.published && <i className="status-dot" />}{item.published ? "PUBLISHED" : "DRAFT"}</span><span>{item.stop_slug}</span><button onClick={() => openEditor(index)}>Edit</button></div>) : <div className="admin-empty-route"><strong>{currentRoute.name}</strong><p>{language === "ko" ? "아직 정류장이 없습니다. 새 항목을 눌러 첫 장소를 추가하세요." : "No stops yet. Add the first location with New item."}</p></div>}</div>
        <div className="admin-subsection"><div className="card-title"><p className="eyebrow">MEMBER NOTES</p><h2>{language === "ko" ? "부원 설명 검토" : "Review member notes"}</h2></div>{routeNotes.length ? routeNotes.map((note) => <div className="note-review-row" key={note.id}><span><strong>{tourStops.find((stop) => stop.id === note.stop_slug)?.name[i] || note.stop_slug}</strong><small>{(i === 0 ? note.body_ko : note.body_en || note.body_ko).slice(0, 120)}</small></span><em>{note.is_published ? "PUBLISHED" : "DRAFT"}</em><button onClick={() => moderateNote(note, "publish")}>{note.is_published ? "Unpublish" : "Publish"}</button><button className="danger-inline" onClick={() => moderateNote(note, "delete")}>Delete</button></div>) : <p className="admin-subsection-empty">{language === "ko" ? "검토할 설명이 없습니다." : "There are no notes to review."}</p>}</div></>}
      {tab === "survey" && <div className="admin-table"><div className="admin-row survey-admin table-head"><span>NO.</span><span>SURVEY</span><span>STATUS</span><span>QUESTIONS</span><span /></div>{surveys.map((survey, index) => <div className="admin-row survey-admin" key={survey.id}><span>{String(survey.number).padStart(2, "0")}</span><span><strong>{i === 0 ? survey.titleKo : survey.titleEn}</strong><small>{survey.date}</small></span><button className={`status-toggle ${survey.status}`} onClick={() => toggleSurvey(survey)}>{survey.status}</button><span>{survey.questions.length}</span><button onClick={() => openEditor(index)}>Edit</button></div>)}</div>}
      {tab === "archive" && <><div className="admin-table"><div className="admin-row archive-admin table-head"><span>YEAR</span><span>TITLE</span><span>FILE</span><span>DATE</span><span /></div>{archiveRows.length ? archiveRows.map((item) => <div className="admin-row archive-admin" key={item.id}><span>{item.year}</span><span><strong>{i === 0 ? item.title_ko : item.title_en || item.title_ko}</strong><small>{i === 0 ? item.summary_ko : item.summary_en || item.summary_ko}</small></span><span>{item.file_name || "—"}</span><span>{item.date}</span><span className="row-actions"><button onClick={() => openArchive(item)}>Edit</button><button onClick={() => removeArchive(item)}>Delete</button></span></div>) : <div className="admin-empty-route"><strong>{language === "ko" ? "등록된 콘텐츠가 없습니다." : "No archive content yet."}</strong><p>{language === "ko" ? "새 콘텐츠 버튼으로 제목, 설명, 파일을 추가할 수 있습니다." : "Add a title, description, and optional file."}</p></div>}</div>
        {pendingFiles.length > 0 && <div className="admin-subsection"><div className="card-title"><p className="eyebrow">UPLOAD INBOX</p><h2>{language === "ko" ? "부원 업로드 대기 파일" : "Member upload inbox"}</h2></div>{pendingFiles.map((file) => <div className="note-review-row" key={file.id}><span><strong>{file.original_name}</strong><small>{new Date(file.created_at).toLocaleString()} · {(file.size_bytes / 1024 / 1024).toFixed(1)} MB</small></span><em>INBOX</em><button onClick={() => file.signed_url && window.open(file.signed_url, "_blank", "noopener,noreferrer")}>Open</button><button className="danger-inline" onClick={async () => { try { await removePendingArchiveFile(file); setPendingFiles((items) => items.filter((item) => item.id !== file.id)); } catch (cause) { fail(cause); } }}>Delete</button></div>)}</div>}</>}
    </section>
    {editor && <div className="admin-editor-modal" role="dialog" aria-modal="true" aria-label="Edit content"><form onSubmit={(event) => { event.preventDefault(); saveEditor(); }}><button type="button" className="upload-close" onClick={() => setEditor(null)}>×</button><p className="eyebrow">{editor.index < 0 ? "CREATE" : "EDIT"} {isTour ? currentRoute.name.toUpperCase() : tab.toUpperCase()}</p><h2>{language === "ko" ? "콘텐츠 편집" : "Edit content"}</h2>{isTour && <label>{language === "ko" ? "지도 위치" : "Map location"}<select value={editor.stopSlug} onChange={(event) => chooseStop(event.target.value)} disabled={editor.index >= 0}>{tourStops.map((stop) => <option key={stop.id} value={stop.id} disabled={editor.index < 0 && currentRows.some((row) => row.stop_slug === stop.id)}>{stop.name[i]} ({stop.id})</option>)}</select></label>}<label>한국어 제목<input value={editor.titleKo} onChange={(event) => setEditor({ ...editor, titleKo: event.target.value })} required /></label><label>English title<input value={editor.titleEn} onChange={(event) => setEditor({ ...editor, titleEn: event.target.value })} required /></label><label className="publish-check"><input type="checkbox" checked={editor.published} onChange={(event) => setEditor({ ...editor, published: event.target.checked })} /><span>{language === "ko" ? "바로 게시" : "Publish now"}</span></label><div className="editor-actions">{editor.index >= 0 && <button type="button" className="danger-action" onClick={deleteEditor}>{language === "ko" ? "삭제" : "Delete"}</button>}<button className="portal-primary" type="submit">{language === "ko" ? "저장" : "Save"}<span>→</span></button></div></form></div>}
    {archiveDraft && <div className="admin-editor-modal" role="dialog" aria-modal="true" aria-label="Add archive content"><form onSubmit={saveArchive}><button type="button" className="upload-close" onClick={() => setArchiveDraft(null)}>×</button><p className="eyebrow">{archiveDraft.id ? "EDIT" : "CREATE"} ARCHIVE CONTENT</p><h2>{language === "ko" ? "아카이브 콘텐츠" : "Archive content"}</h2><label>{language === "ko" ? "분류" : "Collection"}<select value={archiveDraft.collectionId} onChange={(event) => setArchiveDraft({ ...archiveDraft, collectionId: event.target.value })} required>{collectionOptions.map((option) => <option key={option.id} value={option.id}>{option.title}</option>)}</select></label><label>{language === "ko" ? "연도" : "Year"}<input type="number" min="1989" max="2100" value={archiveDraft.year} onChange={(event) => setArchiveDraft({ ...archiveDraft, year: Number(event.target.value) })} required /></label><label>한국어 제목<input value={archiveDraft.titleKo} onChange={(event) => setArchiveDraft({ ...archiveDraft, titleKo: event.target.value })} required /></label><label>English title <small>optional</small><input value={archiveDraft.titleEn} onChange={(event) => setArchiveDraft({ ...archiveDraft, titleEn: event.target.value })} /></label><label>한국어 설명<textarea rows={4} value={archiveDraft.summaryKo} onChange={(event) => setArchiveDraft({ ...archiveDraft, summaryKo: event.target.value })} required /></label><label>English description <small>optional</small><textarea rows={3} value={archiveDraft.summaryEn} onChange={(event) => setArchiveDraft({ ...archiveDraft, summaryEn: event.target.value })} /></label>{!archiveDraft.id && <label>{language === "ko" ? "첨부 파일" : "Attachment"} <small>optional</small><input type="file" accept=".pdf,.pptx,.docx,.xlsx" onChange={(event) => setArchiveDraft({ ...archiveDraft, file: event.target.files?.[0] })} /></label>}<div className="editor-actions"><button className="portal-primary" type="submit">{language === "ko" ? "콘텐츠 저장" : "Save content"}<span>→</span></button></div></form></div>}
    {toast && <div className="admin-toast">✓ {toast}</div>}
  </main>;
}
