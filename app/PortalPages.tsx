"use client";

import { FormEvent, useEffect, useState } from "react";
import { createArchiveEntry, createTourRoute, loadArchiveEntries, loadTourRoutes, StoredArchiveEntry, StoredTourRoute, updateTourRoute } from "./contentApi";
import { ArchiveCollection, initialCollections, initialSurveys, sampleResponses, Survey } from "./portalData";
import { hasSupabaseConfig, requestPasswordReset, signInWithPassword, submitSurveyResponse, uploadArchiveFile } from "./supabase";
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
    <main className="gate-page"><div className="gate-mark">↗</div><p className="eyebrow">MEMBER ACCESS</p><h1>{t.access}</h1><p>{admin && session ? "Admin 권한이 있는 계정으로 다시 로그인하세요." : t.accessBody}</p><button className="portal-primary" onClick={() => navigate("login")}>{t.toLogin}<span>→</span></button></main>
  );
}

function scaleQuestion(label: string, id: string, value: unknown, setAnswer: (id: string, value: unknown) => void, required: boolean) {
  return (
    <fieldset className="question-field"><legend>{label}{required && <em>*</em>}</legend><div className="scale-row">
      {[1,2,3,4,5].map((score) => <label key={score} className={value === score ? "selected" : ""}><input type="radio" name={id} value={score} checked={value === score} onChange={() => setAnswer(id, score)} required={required} /><span>{score}</span></label>)}
    </div><div className="scale-labels"><span>Not yet</span><span>Excellent</span></div></fieldset>
  );
}

export function SurveyPage({ language, session }: { language: Language; session: UserSession | null }) {
  const t = text[language];
  const i = language === "ko" ? 0 : 1;
  const [mode, setMode] = useState<"list" | "form" | "result" | "thanks">("list");
  const [selected, setSelected] = useState<Survey>(initialSurveys[0]);
  const [openId, setOpenId] = useState<string | null>(initialSurveys[0].id);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const setAnswer = (id: string, value: unknown) => setAnswers((current) => ({ ...current, [id]: value }));
  const startSurvey = (survey: Survey) => { setSelected(survey); setAnswers({}); setMode("form"); window.scrollTo(0,0); };

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError("");
    const visible = selected.questions.filter((q) => !q.showWhen || answers[q.showWhen.questionId] === q.showWhen.equals);
    if (visible.some((q) => q.required && (answers[q.id] === undefined || answers[q.id] === ""))) { setError(language === "ko" ? "필수 문항에 모두 응답해 주세요." : "Please answer every required question."); return; }
    try { setSubmitting(true); await submitSurveyResponse(selected.id, answers); setMode("thanks"); } catch (cause) { setError(cause instanceof Error ? cause.message : "Submission failed"); } finally { setSubmitting(false); }
  };

  const resultRows = filter === "all" ? sampleResponses : sampleResponses.filter((row) => row.language === filter);
  const average = (key: "satisfaction" | "knowledge" | "english") => {
    const values = resultRows.map((row) => row[key]).filter((value): value is number => typeof value === "number");
    return values.length ? (values.reduce((a,b) => a+b,0) / values.length).toFixed(1) : "—";
  };
  const downloadCsv = () => {
    const header = "id,submitted_at,satisfaction,language,english,knowledge,comment\n";
    const rows = resultRows.map((row) => [row.id,row.submittedAt,row.satisfaction,row.language,row.english ?? "",row.knowledge,`"${row.comment.replaceAll('"','""')}"`].join(",")).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "survey-results.csv"; link.click(); URL.revokeObjectURL(url);
  };

  if (mode === "form") return (
    <main className="survey-form-page">
      <button className="back-link" onClick={() => setMode("list")}>← {t.back}</button>
      <div className="form-heading"><p className="eyebrow">SURVEY {String(selected.number).padStart(2,"0")}</p><h1>{i === 0 ? selected.titleKo : selected.titleEn}</h1><p>{i === 0 ? selected.descriptionKo : selected.descriptionEn}</p></div>
      <form className="survey-form" onSubmit={submit}>
        {selected.questions.map((question, index) => {
          if (question.showWhen && answers[question.showWhen.questionId] !== question.showWhen.equals) return null;
          const label = i === 0 ? question.labelKo : question.labelEn;
          return <div className="question-block" key={question.id}><span className="question-index">{String(index+1).padStart(2,"0")}</span>
            {question.type === "scale" ? scaleQuestion(label, question.id, answers[question.id], setAnswer, question.required) : question.type === "single" ? (
              <fieldset className="question-field"><legend>{label}{question.required && <em>*</em>}</legend><div className="choice-row">{question.options?.map((option) => <label key={option} className={answers[question.id] === option ? "selected" : ""}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswer(question.id, option)} /><span>{option}</span></label>)}</div></fieldset>
            ) : <label className="question-field"><strong>{label}</strong><textarea value={String(answers[question.id] ?? "")} onChange={(e) => setAnswer(question.id, e.target.value)} maxLength={2000} rows={5} placeholder={language === "ko" ? "의견을 자유롭게 남겨주세요." : "Share your thoughts."} /></label>}
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
        <div className="result-toolbar"><select aria-label="Survey"><option>Survey 01 — {i === 0 ? initialSurveys[0].titleKo : initialSurveys[0].titleEn}</option></select><select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Language filter"><option value="all">All languages</option><option value="한국어">한국어</option><option value="English">English</option></select><button onClick={downloadCsv}>CSV ↓</button></div>
        <section className="metric-grid"><article><span>TOTAL</span><strong>{resultRows.length}</strong><small>{t.responses}</small></article><article><span>SATISFACTION</span><strong>{average("satisfaction")}</strong><small>/ 5.0</small></article><article><span>KNOWLEDGE</span><strong>{average("knowledge")}</strong><small>/ 5.0</small></article><article><span>ENGLISH</span><strong>{average("english")}</strong><small>/ 5.0</small></article></section>
        <section className="result-grid"><article className="chart-card"><div className="card-title"><p className="eyebrow">DISTRIBUTION</p><h2>{language === "ko" ? "만족도 분포" : "Satisfaction distribution"}</h2></div><div className="bar-chart">{[5,4,3,2,1].map((score) => { const count = resultRows.filter((row) => row.satisfaction === score).length; return <div key={score}><span>{score}</span><i><b style={{width:`${resultRows.length ? count/resultRows.length*100 : 0}%`}} /></i><strong>{count}</strong></div>; })}</div></article><article className="comments-card"><div className="card-title"><p className="eyebrow">COMMENTS</p><h2>{language === "ko" ? "최근 자유 의견" : "Recent comments"}</h2></div>{resultRows.slice(0,3).map((row) => <blockquote key={row.id}><p>“{row.comment}”</p><footer>{row.id} · {row.submittedAt}</footer></blockquote>)}</article></section>
        <section className="response-table-wrap"><div className="card-title"><p className="eyebrow">RAW RESPONSES</p><h2>{language === "ko" ? "응답표" : "Response table"}</h2></div><div className="table-scroll"><table><thead><tr><th>ID</th><th>Date</th><th>Satisfaction</th><th>Language</th><th>English</th><th>Knowledge</th><th>Comment</th></tr></thead><tbody>{resultRows.map((row) => <tr key={row.id}><th>{row.id}</th><td>{row.submittedAt}</td><td>{row.satisfaction}</td><td>{row.language}</td><td>{row.english ?? "—"}</td><td>{row.knowledge}</td><td>{row.comment}</td></tr>)}</tbody></table></div></section>
      </main>
    );
  }

  return (
    <main className="survey-list-page">
      <PageHero label="VISITOR FEEDBACK" title={t.survey} body={t.surveyIntro} action={session && <button className="portal-accent" onClick={() => setMode("result")}>{t.result}<span>↗</span></button>} />
      <section className="survey-list">{initialSurveys.map((survey) => { const open = openId === survey.id; return <article key={survey.id} className={open ? "survey-item open" : "survey-item"}>
        <button className="survey-summary" onClick={() => setOpenId(open ? null : survey.id)} aria-expanded={open}><span className="survey-index">{String(survey.number).padStart(2,"0")}</span><span><small>SURVEY {survey.number} · {survey.date}</small><strong>{i === 0 ? survey.titleKo : survey.titleEn}</strong></span><em>{survey.status === "published" ? "OPEN" : "CLOSED"}</em><b>{open ? "−" : "+"}</b></button>
        {open && <div className="survey-detail"><p>{i === 0 ? survey.descriptionKo : survey.descriptionEn}</p><button disabled={survey.status !== "published"} onClick={() => startSurvey(survey)}>{survey.status === "published" ? t.start : t.closed}<span>→</span></button></div>}
      </article>; })}</section>
    </main>
  );
}

export function DataPage({ language, session }: { language: Language; session: UserSession | null }) {
  const t = text[language]; const i = language === "ko" ? 0 : 1;
  const [collections,setCollections] = useState(initialCollections);
  const [selected, setSelected] = useState<ArchiveCollection | null>(null);
  const [year, setYear] = useState<number | "all">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadState, setUploadState] = useState<{name:string;progress:number;message:string} | null>(null);
  useEffect(() => {
    loadArchiveEntries().then(({items}) => {
      if (!items.length) return;
      const memberCollection: ArchiveCollection = {
        id:"member-content", code:"MEMBER CONTENT", titleKo:"멤버 등록 자료", titleEn:"Member Content",
        summaryKo:"관리자가 직접 추가한 아카이브 콘텐츠입니다.", summaryEn:"Archive content added directly by administrators.",
        accent:"#6d54d9", published:true,
        entries:items.map((item) => ({
          id:item.id, year:item.year, date:item.date, titleKo:item.title_ko, titleEn:item.title_en || item.title_ko,
          subtitleKo:"관리자 등록 콘텐츠", subtitleEn:"Admin content", summaryKo:item.summary_ko, summaryEn:item.summary_en || item.summary_ko,
          files:item.file_name ? [{name:item.file_name,type:(item.file_type || "FILE").split("/").pop()?.toUpperCase() || "FILE",size:item.file_size ? `${(item.file_size/1024/1024).toFixed(1)} MB` : "",url:item.file_url || undefined}] : [],
        })),
      };
      setCollections(items => [...items.filter(item => item.id !== memberCollection.id), memberCollection]);
    }).catch(() => undefined);
  }, []);
  if (!session) return <Gate language={language} session={session} />;

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const allowed = ["application/pdf","application/vnd.openxmlformats-officedocument.presentationml.presentation","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
    if (!allowed.includes(file.type) || file.size > 25 * 1024 * 1024) { setUploadState({name:file.name,progress:0,message:language === "ko" ? "지원 형식과 25MB 제한을 확인하세요." : "Check the file type and 25 MB limit."}); return; }
    setUploadState({name:file.name,progress:8,message:""});
    try { await uploadArchiveFile(file, session.token, selected?.entries[0]?.id ?? "inbox", (progress) => setUploadState({name:file.name,progress,message:""})); setUploadState({name:file.name,progress:100,message:language === "ko" ? "업로드가 완료되었습니다." : "Upload complete."}); } catch (cause) { setUploadState({name:file.name,progress:0,message:cause instanceof Error ? cause.message : "Upload failed"}); }
  };

  if (!selected) return (
    <main className="archive-page"><PageHero label="MEMBER LIBRARY" title={t.archive} body={t.archiveIntro} action={<button className="portal-accent" onClick={() => setUploadOpen(true)}>{t.upload}<span>＋</span></button>} />
      <section className="collection-grid">{collections.map((collection, index) => <button key={collection.id} className="collection-card" onClick={() => setSelected(collection)} style={{"--accent":collection.accent} as React.CSSProperties}><span className="collection-code">{collection.code}</span><b>0{index+1}</b><div className="collection-symbol">{index === 0 ? "⌁" : index === 1 ? "◫" : "✦"}</div><h2>{i === 0 ? collection.titleKo : collection.titleEn}</h2><p>{i === 0 ? collection.summaryKo : collection.summaryEn}</p><footer><span>{collection.entries.length} records</span><em>→</em></footer></button>)}</section>
      {uploadOpen && <UploadDialog language={language} state={uploadState} onFile={upload} onClose={() => setUploadOpen(false)} />}
    </main>
  );

  const years = Array.from(new Set(selected.entries.map((entry) => entry.year))).sort((a,b) => b-a);
  const entries = year === "all" ? selected.entries : selected.entries.filter((entry) => entry.year === year);
  return (
    <main className="archive-detail-page"><button className="back-link" onClick={() => {setSelected(null);setYear("all");}}>← {t.archive}</button>
      <div className="archive-heading" style={{"--accent":selected.accent} as React.CSSProperties}><p className="eyebrow">{selected.code}</p><h1>{i === 0 ? selected.titleKo : selected.titleEn}</h1><p>{i === 0 ? selected.summaryKo : selected.summaryEn}</p><button className="portal-accent" onClick={() => setUploadOpen(true)}>{t.upload}<span>＋</span></button></div>
      <div className="year-tabs"><span>{t.year}</span><button className={year === "all" ? "active" : ""} onClick={() => setYear("all")}>ALL</button>{years.map((item) => <button key={item} className={year === item ? "active" : ""} onClick={() => setYear(item)}>{item}</button>)}</div>
      <section className="entry-list">{entries.length === 0 ? <div className="empty-state">∅<p>{t.empty}</p></div> : entries.map((entry) => <article key={entry.id} className={expanded === entry.id ? "entry-item open" : "entry-item"}><button onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}><time>{entry.date}</time><span><small>{i === 0 ? entry.subtitleKo : entry.subtitleEn}</small><strong>{i === 0 ? entry.titleKo : entry.titleEn}</strong></span><b>{expanded === entry.id ? "−" : "+"}</b></button>{expanded === entry.id && <div className="entry-body"><p>{i === 0 ? entry.summaryKo : entry.summaryEn}</p><h3>{t.files}</h3>{entry.files.length ? entry.files.map((file) => <div className="file-row" key={file.name}><i>{file.type}</i><span><strong>{file.name}</strong><small>{file.size}</small></span><button aria-label={`Download ${file.name}`} disabled={!file.url} onClick={() => file.url && window.open(file.url,"_blank","noopener,noreferrer")}>↓</button></div>) : <p className="muted">No attachments</p>}</div>}</article>)}</section>
      {uploadOpen && <UploadDialog language={language} state={uploadState} onFile={upload} onClose={() => setUploadOpen(false)} />}
    </main>
  );
}

function UploadDialog({language,state,onFile,onClose}:{language:Language;state:{name:string;progress:number;message:string}|null;onFile:(file:File|undefined)=>void;onClose:()=>void}) {
  return <div className="upload-modal" role="dialog" aria-modal="true" aria-label="Upload resource"><div className="upload-card"><button className="upload-close" onClick={onClose}>×</button><p className="eyebrow">MEMBER UPLOAD</p><h2>{language === "ko" ? "새 자료 업로드" : "Upload a resource"}</h2><p>{language === "ko" ? "PDF, PPTX, DOCX, XLSX · 파일당 최대 25MB" : "PDF, PPTX, DOCX, XLSX · Up to 25 MB each"}</p><label className="drop-zone"><input type="file" accept=".pdf,.pptx,.docx,.xlsx" onChange={(e) => onFile(e.target.files?.[0])} /><span>＋</span><strong>{language === "ko" ? "파일 선택" : "Choose a file"}</strong></label>{state && <div className="upload-progress"><div><span>{state.name}</span><b>{state.progress}%</b></div><i><em style={{width:`${state.progress}%`}} /></i>{state.message && <p>{state.message}</p>}</div>}</div></div>;
}

export function LoginPage({ language, session, setSession }: { language: Language; session: UserSession | null; setSession: (session: UserSession | null) => void }) {
  const t = text[language];
  const [email,setEmail] = useState(""); const [password,setPassword] = useState(""); const [error,setError] = useState(""); const [notice,setNotice] = useState(""); const [loading,setLoading] = useState(false);
  const signIn = async (event:FormEvent) => { event.preventDefault();setError("");try{setLoading(true);const auth=await signInWithPassword(email,password);setSession({email:auth.email,role:auth.role,token:auth.accessToken});navigate("data");}catch(cause){setError(cause instanceof Error?cause.message:"Login failed");}finally{setLoading(false);} };
  const reset = async () => { if(!email){setError(language === "ko" ? "이메일을 먼저 입력하세요." : "Enter your email first.");return;}try{await requestPasswordReset(email,window.location.href.split("#")[0]);setNotice(language === "ko" ? "재설정 메일을 확인하세요." : "Check your email for the reset link.");}catch(cause){setError(cause instanceof Error?cause.message:"Reset failed");} };
  if(session) return <main className="login-page"><div className="login-visual"><p>SSHS AMBASSADORS</p><h1>Welcome<br/>back.</h1><span>{session.role.toUpperCase()} ACCESS</span></div><div className="login-panel"><p className="eyebrow">SIGNED IN</p><h2>{session.email}</h2><p>{session.role} account</p><button className="portal-primary wide" onClick={() => {setSession(null);navigate("intro");}}>{t.logout}<span>→</span></button></div></main>;
  return <main className="login-page"><div className="login-visual"><div className="login-grid"/><p>SSHS AMBASSADORS</p><h1>Inside<br/>the team.</h1><span>MEMBER SPACE · PRIVATE ARCHIVE</span></div><div className="login-panel"><p className="eyebrow">MEMBER ACCESS</p><h2>{t.login}</h2><p>{t.loginIntro}</p>{hasSupabaseConfig ? <form onSubmit={signIn}><label>{t.email}<input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email"/></label><label>{t.password}<input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required autoComplete="current-password"/></label>{error&&<p className="form-error">{error}</p>}{notice&&<p className="form-notice">{notice}</p>}<button className="portal-primary wide" disabled={loading}>{loading?"Signing in…":t.signIn}<span>→</span></button><button type="button" className="reset-link" onClick={reset}>{t.reset}</button></form> : <div className="preview-login"><div className="preview-note"><strong>{t.preview}</strong><p>{t.previewBody}</p></div><button onClick={()=>{setSession({email:"member@example.test",role:"member",token:"demo-member",demo:true});navigate("data");}}>{t.memberPreview}<span>→</span></button><button onClick={()=>{setSession({email:"admin@example.test",role:"admin",token:"demo-admin",demo:true});navigate("admin");}}>{t.adminPreview}<span>→</span></button></div>}</div></main>;
}

type TourAdminRow = { titleKo: string; titleEn: string; published: boolean };
type ArchiveDraft = { year: number; titleKo: string; titleEn: string; summaryKo: string; summaryEn: string; file?: File };

export function AdminPage({ language, session }: { language: Language; session: UserSession | null }) {
  const t = text[language]; const i = language === "ko" ? 0 : 1;
  const defaultRows = tourStops.map((stop) => ({titleKo:stop.name[0],titleEn:stop.name[1],published:true}));
  const [tab,setTab] = useState("tour-1");
  const [routes,setRoutes] = useState<StoredTourRoute[]>([{id:"tour-1",name:"Tour 1",color:"#ff2d8d",sort_index:1}]);
  const [routeRows,setRouteRows] = useState<Record<string,TourAdminRow[]>>({"tour-1":defaultRows});
  const [surveys,setSurveys] = useState(initialSurveys);
  const [archiveRows,setArchiveRows] = useState<StoredArchiveEntry[]>([]);
  const [archiveDraft,setArchiveDraft] = useState<ArchiveDraft | null>(null);
  const [toast,setToast] = useState("");
  const [editor,setEditor] = useState<{index:number;titleKo:string;titleEn:string;published:boolean}|null>(null);
  const isTour = tab.startsWith("tour-");
  const currentRoute = routes.find(route => route.id === tab) || routes[0] || {id:"tour-1",name:"Tour 1",color:"#ff2d8d",sort_index:1};
  const currentRows = routeRows[currentRoute?.id || "tour-1"] || [];

  useEffect(() => {
    loadTourRoutes().then(({items}) => {
      if (!items.length) return;
      setRoutes(items); setRouteRows(rows => Object.fromEntries(items.map(item => [item.id, rows[item.id] || (item.id === "tour-1" ? defaultRows : [])])));
    }).catch(() => undefined);
    loadArchiveEntries().then(({items}) => setArchiveRows(items)).catch(() => undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if(!session || session.role!=="admin") return <Gate language={language} session={session} admin />;
  const saved = (message?:string) => {setToast(message || (language === "ko" ? "변경 사항을 저장했습니다." : "Changes saved."));setTimeout(()=>setToast(""),2200);};
  const addRoute = async () => {
    const number = Math.max(0, ...routes.map(route => route.sort_index)) + 1;
    let item: StoredTourRoute = {id:`tour-${number}`,name:`Tour ${number}`,color:["#005ce6","#16a085","#f39c12","#8e44ad"][number % 4],sort_index:number};
    try { item = (await createTourRoute(item.name,item.color)).item; } catch { /* Preview keeps a temporary route. */ }
    setRoutes(items => [...items.filter(route => route.id !== item.id),item].sort((a,b)=>a.sort_index-b.sort_index));
    setRouteRows(rows => ({...rows,[item.id]:rows[item.id] || []})); setTab(item.id); saved(language === "ko" ? `${item.name}을 생성했습니다.` : `${item.name} created.`);
  };
  const setRouteColor = async (color:string) => {
    if(!currentRoute) return;
    setRoutes(items => items.map(item => item.id===currentRoute.id?{...item,color}:item));
    try { await updateTourRoute(currentRoute.id,color); } catch { /* Preview fallback. */ }
  };
  const openEditor = (index:number) => {
    if(index < 0) { setEditor({index:-1,titleKo:"",titleEn:"",published:false}); return; }
    if(isTour) setEditor({index,titleKo:currentRows[index].titleKo,titleEn:currentRows[index].titleEn,published:currentRows[index].published});
    if(tab === "survey") setEditor({index,titleKo:surveys[index].titleKo,titleEn:surveys[index].titleEn,published:surveys[index].status === "published"});
  };
  const saveEditor = () => {
    if(!editor || !editor.titleKo.trim() || !editor.titleEn.trim()) return;
    if(isTour) setRouteRows(all => ({...all,[currentRoute.id]:(all[currentRoute.id] || []).map((item,index)=>index===editor.index?{...item,titleKo:editor.titleKo,titleEn:editor.titleEn,published:editor.published}:item).concat(editor.index < 0 ? [{titleKo:editor.titleKo,titleEn:editor.titleEn,published:editor.published}] : [])}));
    if(tab === "survey") setSurveys(items => editor.index < 0 ? [...items,{...initialSurveys[0],id:`draft-${Date.now()}`,number:items.length+1,titleKo:editor.titleKo,titleEn:editor.titleEn,status:editor.published?"published":"draft"}] : items.map((item,index)=>index===editor.index?{...item,titleKo:editor.titleKo,titleEn:editor.titleEn,status:editor.published?"published":"draft"}:item));
    setEditor(null); saved();
  };
  const deleteEditor = () => {
    if(!editor || editor.index < 0) return;
    if(isTour) setRouteRows(all => ({...all,[currentRoute.id]:(all[currentRoute.id] || []).filter((_,index)=>index!==editor.index)}));
    if(tab === "survey") setSurveys(items => items.filter((_,index)=>index!==editor.index));
    setEditor(null); saved();
  };
  const saveArchive = async (event:FormEvent) => {
    event.preventDefault(); if(!archiveDraft) return;
    try {
      const item = (await createArchiveEntry(archiveDraft)).item; setArchiveRows(items => [item,...items]);
    } catch {
      setArchiveRows(items => [{id:`preview-${Date.now()}`,year:archiveDraft.year,date:new Date().toISOString().slice(0,10),title_ko:archiveDraft.titleKo,title_en:archiveDraft.titleEn,summary_ko:archiveDraft.summaryKo,summary_en:archiveDraft.summaryEn,file_url:null,file_name:archiveDraft.file?.name || null,file_type:archiveDraft.file?.type || null,file_size:archiveDraft.file?.size || null},...items]);
    }
    setArchiveDraft(null); saved(language === "ko" ? "아카이브 콘텐츠를 추가했습니다." : "Archive content added.");
  };

  return <main className="admin-page"><PageHero label="CONTENT MANAGEMENT" title={t.admin} body={t.adminIntro} action={<div className="admin-user"><span>ADMIN</span><strong>{session.email}</strong></div>}/>
    <div className="admin-tabs">{routes.map(route => <button key={route.id} className={tab===route.id?"active":""} style={{"--tour-color":route.color} as React.CSSProperties} onClick={()=>setTab(route.id)}>{route.name} <span>{(routeRows[route.id] || []).length}</span></button>)}<button className={tab==="survey"?"active":""} onClick={()=>setTab("survey")}>Survey <span>{surveys.length}</span></button><button className={tab==="archive"?"active":""} onClick={()=>setTab("archive")}>Archive <span>{archiveRows.length}</span></button><button className="add-tour-tab" onClick={addRoute} aria-label={language === "ko" ? "새 투어 루트 추가" : "Add tour route"}>＋</button></div>
    <section className="admin-workspace"><div className="workspace-heading"><div><p className="eyebrow">{isTour?currentRoute.name.toUpperCase():tab.toUpperCase()} CONTENT</p><h2>{isTour?(language==="ko"?"투어 장소 관리":"Tour stops"):tab==="survey"?(language==="ko"?"설문 관리":"Surveys"):(language==="ko"?"아카이브 콘텐츠 관리":"Archive content")}</h2>{isTour&&<label className="route-color-control"><span>{language==="ko"?"루트 색상":"Route color"}</span><input type="color" value={currentRoute.color} onChange={(event)=>setRouteColor(event.target.value)}/><b>{currentRoute.color}</b></label>}</div><button className="portal-accent" onClick={()=>tab==="archive"?setArchiveDraft({year:new Date().getFullYear(),titleKo:"",titleEn:"",summaryKo:"",summaryEn:""}):openEditor(-1)}>＋ {tab==="archive"?(language==="ko"?"새 콘텐츠":"New content"):(language==="ko"?"새 항목":"New item")}</button></div>
      {isTour&&<div className="admin-table" style={{"--route-accent":currentRoute.color} as React.CSSProperties}><div className="admin-row table-head"><span>ORDER</span><span>NAME</span><span>STATUS</span><span>LAST EDIT</span><span/></div>{currentRows.length?currentRows.map((item,index)=><div className="admin-row" key={`${item.titleEn}-${index}`}><span className="drag">⠿ {String(index+1).padStart(2,"0")}</span><span><strong>{i===0?item.titleKo:item.titleEn}</strong><small>{i===0?item.titleEn:item.titleKo}</small></span><span>{item.published&&<i className="status-dot"/>}{item.published?"PUBLISHED":"DRAFT"}</span><span>2026.08.19</span><button onClick={()=>openEditor(index)}>Edit</button></div>):<div className="admin-empty-route"><strong>{currentRoute.name}</strong><p>{language==="ko"?"아직 정류장이 없습니다. 새 항목을 눌러 첫 장소를 추가하세요.":"No stops yet. Add the first location with New item."}</p></div>}</div>}
      {tab==="survey"&&<div className="admin-table"><div className="admin-row survey-admin table-head"><span>NO.</span><span>SURVEY</span><span>STATUS</span><span>QUESTIONS</span><span/></div>{surveys.map((survey,index)=><div className="admin-row survey-admin" key={survey.id}><span>{String(survey.number).padStart(2,"0")}</span><span><strong>{i===0?survey.titleKo:survey.titleEn}</strong><small>{survey.date}</small></span><button className={`status-toggle ${survey.status}`} onClick={()=>setSurveys(items=>items.map(item=>item.id===survey.id?{...item,status:item.status==="published"?"draft":"published"}:item))}>{survey.status}</button><span>{survey.questions.length}</span><button onClick={()=>openEditor(index)}>Edit</button></div>)}</div>}
      {tab==="archive"&&<div className="admin-table"><div className="admin-row survey-admin table-head"><span>YEAR</span><span>TITLE</span><span>FILE</span><span>DATE</span><span/></div>{archiveRows.length?archiveRows.map((item)=><div className="admin-row survey-admin" key={item.id}><span>{item.year}</span><span><strong>{i===0?item.title_ko:item.title_en||item.title_ko}</strong><small>{i===0?item.summary_ko:item.summary_en||item.summary_ko}</small></span><span>{item.file_name||"—"}</span><span>{item.date}</span><span>READY</span></div>):<div className="admin-empty-route"><strong>{language==="ko"?"등록된 콘텐츠가 없습니다.":"No archive content yet."}</strong><p>{language==="ko"?"새 콘텐츠 버튼으로 제목, 설명, 파일을 추가할 수 있습니다.":"Add a title, description, and optional file."}</p></div>}</div>}
    </section>
    {editor&&<div className="admin-editor-modal" role="dialog" aria-modal="true" aria-label="Edit content"><form onSubmit={(event)=>{event.preventDefault();saveEditor();}}><button type="button" className="upload-close" onClick={()=>setEditor(null)}>×</button><p className="eyebrow">{editor.index<0?"CREATE":"EDIT"} {isTour?currentRoute.name.toUpperCase():tab.toUpperCase()}</p><h2>{language==="ko"?"콘텐츠 편집":"Edit content"}</h2><label>한국어 제목<input value={editor.titleKo} onChange={(event)=>setEditor({...editor,titleKo:event.target.value})} required/></label><label>English title<input value={editor.titleEn} onChange={(event)=>setEditor({...editor,titleEn:event.target.value})} required/></label><label className="publish-check"><input type="checkbox" checked={editor.published} onChange={(event)=>setEditor({...editor,published:event.target.checked})}/><span>{language==="ko"?"바로 게시":"Publish now"}</span></label><div className="editor-actions">{editor.index>=0&&<button type="button" className="danger-action" onClick={deleteEditor}>{language==="ko"?"삭제":"Delete"}</button>}<button className="portal-primary" type="submit">{language==="ko"?"저장":"Save"}<span>→</span></button></div></form></div>}
    {archiveDraft&&<div className="admin-editor-modal" role="dialog" aria-modal="true" aria-label="Add archive content"><form onSubmit={saveArchive}><button type="button" className="upload-close" onClick={()=>setArchiveDraft(null)}>×</button><p className="eyebrow">CREATE ARCHIVE CONTENT</p><h2>{language==="ko"?"아카이브 콘텐츠 추가":"Add archive content"}</h2><label>{language==="ko"?"연도":"Year"}<input type="number" min="1989" max="2100" value={archiveDraft.year} onChange={(event)=>setArchiveDraft({...archiveDraft,year:Number(event.target.value)})} required/></label><label>한국어 제목<input value={archiveDraft.titleKo} onChange={(event)=>setArchiveDraft({...archiveDraft,titleKo:event.target.value})} required/></label><label>English title <small>optional</small><input value={archiveDraft.titleEn} onChange={(event)=>setArchiveDraft({...archiveDraft,titleEn:event.target.value})}/></label><label>한국어 설명<textarea rows={4} value={archiveDraft.summaryKo} onChange={(event)=>setArchiveDraft({...archiveDraft,summaryKo:event.target.value})} required/></label><label>English description <small>optional</small><textarea rows={3} value={archiveDraft.summaryEn} onChange={(event)=>setArchiveDraft({...archiveDraft,summaryEn:event.target.value})}/></label><label>{language==="ko"?"첨부 파일":"Attachment"} <small>optional</small><input type="file" onChange={(event)=>setArchiveDraft({...archiveDraft,file:event.target.files?.[0]})}/></label><div className="editor-actions"><button className="portal-primary" type="submit">{language==="ko"?"콘텐츠 저장":"Save content"}<span>→</span></button></div></form></div>}
    {toast&&<div className="admin-toast">✓ {toast}</div>}
  </main>;
}
