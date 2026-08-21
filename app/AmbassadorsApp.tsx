"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import CampusMap from "./CampusMap";
import { createTourNote, loadTourNotes, StoredTourNote } from "./contentApi";
import { copy, Language, RouteKey, tourStops } from "./data";
import { AdminPage, DataPage, LoginPage, SurveyPage, UserSession } from "./PortalPages";

function routeFromHash(): RouteKey {
  if (typeof window === "undefined") return "intro";
  const key = window.location.hash.replace(/^#\//, "").split("/")[0] as RouteKey;
  return ["intro", "tour", "survey", "data", "login", "admin"].includes(key) ? key : "intro";
}

function goTo(route: RouteKey) { window.location.hash = `#/${route}`; }

function ArrowIcon({ direction = "right" }: { direction?: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={direction === "left" ? "flip" : ""}>
      <path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Header({ language, onLanguage, route, session, onLogout }: { language: Language; onLanguage: () => void; route: RouteKey; session: UserSession | null; onLogout: () => void }) {
  const t = copy[language];
  const [menuOpen, setMenuOpen] = useState(false);
  const navItems: RouteKey[] = ["intro", "tour", "survey", "data"];
  const navigate = (item: RouteKey) => { goTo(item); setMenuOpen(false); };

  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate("intro")} aria-label="SSHS Ambassadors home">
        <img src="assets/sshs-logo.png" alt="" />
        <span><strong>SSHS</strong><small>AMBASSADORS</small></span>
      </button>
      <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Primary navigation">
        {navItems.map((item) => <button key={item} className={route === item ? "active" : ""} onClick={() => navigate(item)}>{t.nav[item]}</button>)}
        {session?.role === "admin" && <button className={route === "admin" ? "active" : ""} onClick={() => navigate("admin")}>{t.nav.admin}</button>}
        <button className={route === "login" ? "active login-mobile" : "login-mobile"} onClick={() => navigate("login")}>{t.nav.login}</button>
      </nav>
      <div className="header-actions">
        <button className="language-toggle" onClick={onLanguage} aria-label="Switch language">{t.language}</button>
        <button className="login-button" onClick={() => session ? onLogout() : navigate("login")}><span>{session ? `${session.role} · ${language === "ko" ? "로그아웃" : "Sign out"}` : t.nav.login}</span><ArrowIcon /></button>
        <button className="menu-button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Open menu"><span /><span /></button>
      </div>
    </header>
  );
}

function IntroPage({ language }: { language: Language }) {
  const t = copy[language];
  return (
    <main>
      <section className="hero-section">
        <div className="hero-grid" aria-hidden="true" /><div className="hero-orbit orbit-one" aria-hidden="true" /><div className="hero-orbit orbit-two" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow light">{t.eyebrow}</p>
          <h1><span>{t.heroTitleA}</span><br />{t.heroTitleB}</h1>
          <p className="hero-body">{t.heroBody}</p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => goTo("tour")}>{t.startTour}<ArrowIcon /></button>
          </div>
        </div>
        <div className="hero-visual" aria-label="Campus tour preview">
          <div className="visual-header"><span>FULL CAMPUS MAP</span><b>{tourStops.length} STOPS</b></div><CampusMap stopIndex={0} variant="overview" language={language} />
          <div className="visual-footer"><span><i /> READY TO EXPLORE</span><button onClick={() => goTo("tour")} aria-label="Open campus tour"><ArrowIcon /></button></div>
        </div>
      </section>
    </main>
  );
}

function MemberNotes({ slug, language, session }: { slug: string; language: Language; session: UserSession | null }) {
  const [notes, setNotes] = useState<StoredTourNote[]>([]);
  const [editing, setEditing] = useState(false);
  const [bodyKo, setBodyKo] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadTourNotes("tour-1", slug)
    .then(({ items }) => { if (active) setNotes(items ?? []); })      .catch(() => undefined);
    return () => { active = false; };
  }, [slug]);

  if (!session && notes.length === 0) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!session) return;
    if (!bodyKo.trim()) {
      setError(language === "ko" ? "한국어 설명을 입력해 주세요." : "Please add the Korean description.");
      return;
    }
    try {
      setSaving(true); setError("");
      let note: StoredTourNote;
      try {
        note = (await createTourNote("tour-1", slug, bodyKo.trim(), bodyEn.trim(), imageFiles)).item;
      } catch (cause) {
        if (!session.demo) throw cause;
        const imageUrls = imageFiles.map((image) => URL.createObjectURL(image));
        note = { id: `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`, route_id: "tour-1", stop_slug: slug, body_ko: bodyKo.trim(), body_en: bodyEn.trim(), image_url: imageUrls[0] || null, image_name: imageFiles[0]?.name || null, image_urls: imageUrls, image_names: imageFiles.map((image) => image.name), author_email: session.email, created_at: new Date().toISOString() };
      }
      setNotes((items) => [note, ...items]); setBodyKo(""); setBodyEn(""); setImageFiles([]); setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this note.");
    } finally { setSaving(false); }
  };

  return (
    <section className="member-notes" aria-label={language === "ko" ? "홍보단 장소 설명" : "Ambassador place notes"}>
      <div className="member-notes-heading">
        <div><span>MEMBER NOTES</span><strong>{language === "ko" ? "홍보단 설명" : "Ambassador notes"}</strong></div>
        {session && <button type="button" onClick={() => setEditing((value) => !value)}>{editing ? (language === "ko" ? "취소" : "Cancel") : (language === "ko" ? "+ 설명 추가" : "+ Add note")}</button>}
      </div>
      {notes.length > 0 && <div className="member-note-list">{notes.map((note) => <MemberNoteCard key={note.id} note={note} language={language} />)}</div>}
      {editing && <form className="member-note-form" onSubmit={submit}>
        <label>한국어 설명<textarea rows={3} maxLength={2000} value={bodyKo} onChange={(event) => setBodyKo(event.target.value)} required /></label>
        <label>English<textarea rows={3} maxLength={2000} value={bodyEn} onChange={(event) => setBodyEn(event.target.value)} /></label>
        <label className="member-image-field">{language === "ko" ? "사진" : "Photo"} <small>optional</small><input type="file" accept="image/*" multiple onChange={(event) => setImageFiles(Array.from(event.target.files || []))} /></label>
        <button className="member-note-submit" disabled={saving}>{saving ? (language === "ko" ? "저장 중…" : "Saving…") : (language === "ko" ? "설명 등록" : "Post note")}</button>
      </form>}
      {error && <p className="member-note-error" role="alert">{error}</p>}
    </section>
  );
}

function MemberNoteCard({ note, language }: { note: StoredTourNote; language: Language }) {
  const track = useRef<HTMLDivElement>(null);
  const imageUrls = note.image_urls?.length ? note.image_urls : note.image_url ? [note.image_url] : [];
  const imageNames = note.image_names?.length ? note.image_names : note.image_name ? [note.image_name] : [];
  return <article className="member-note-card">
    <div className="member-note-carousel" ref={track}>
      <section className="member-note-slide"><span>AMBASSADOR NOTE</span><p>{language === "ko" ? note.body_ko || note.body_en : note.body_en || note.body_ko}</p>{imageUrls.length > 0 && <button type="button" onClick={() => track.current?.scrollTo({ left: track.current.clientWidth, behavior: "smooth" })}>{language === "ko" ? `사진 ${imageUrls.length}장 보기` : `View ${imageUrls.length} photo${imageUrls.length === 1 ? "" : "s"}`} →</button>}</section>
      {imageUrls.map((imageUrl, index) => <section className="member-note-slide member-note-photo" key={`${imageUrl}-${index}`}><img src={imageUrl} alt={imageNames[index] || `Tour location ${index + 1}`} /><span className="member-photo-count">{index + 1} / {imageUrls.length}</span><button type="button" onClick={() => track.current?.scrollTo({ left: 0, behavior: "smooth" })}>← {language === "ko" ? "설명" : "Note"}</button></section>)}
    </div>
  </article>;
}

function TourPage({ language, session }: { language: Language; session: UserSession | null }) {
  const t = copy[language];
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const langIndex = language === "ko" ? 0 : 1;

  const move = (index: number) => {
    const next = (index + tourStops.length) % tourStops.length;
    setActive(next);
    containerRef.current?.querySelector<HTMLElement>(`[data-stop-index="${next}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setActive(Number((visible.target as HTMLElement).dataset.stopIndex));
    }, { root, threshold: [0.45, 0.65, 0.8] });
    root.querySelectorAll("[data-stop-index]").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <main className="tour-page">
      <div className="tour-intro-strip"><p className="tour-only-title">{t.tourLabel}</p></div>
      <div className="tour-progress" aria-label={`Tour progress ${active + 1} of ${tourStops.length}`}><span style={{ width: `${((active + 1) / tourStops.length) * 100}%` }} /></div>
      <div className="tour-slides" ref={containerRef}>
        {tourStops.map((stop, index) => (
          <section className="tour-slide" key={stop.id} data-stop-index={index} aria-label={`${index + 1}. ${stop.name[langIndex]}`}>
            <div className="tour-map-column">
              <div className="map-toolbar">
                <div className="legend"><span><i className="legend-dot" />{t.mapLegend}</span><span><i className="legend-line" />{t.routeLegend}</span></div>
                <button onClick={() => setExpanded(true)}>{t.zoom}<span>⛶</span></button>
              </div>
              <CampusMap stopIndex={index} variant="tour" language={language} /><p className="map-note">{t.floorPlan}</p>
            </div>
            <article className="stop-card">
              <div className="stop-meta"><span>{stop.building[langIndex]}</span><span>{stop.floor[langIndex]}</span></div>
              <p className="stop-number">STOP {String(index + 1).padStart(2, "0")} / {tourStops.length}</p>
              <h2>{stop.name[langIndex]}</h2>
              <MemberNotes slug={stop.id} language={language} session={session} />
            </article>
          </section>
        ))}
      </div>
      <div className="stop-rail" aria-label="Tour stops">
        {tourStops.map((stop, index) => <button key={stop.id} className={index === active ? "active" : ""} onClick={() => move(index)} aria-label={`Go to stop ${index + 1}: ${stop.name[langIndex]}`}><span>{String(index + 1).padStart(2, "0")}</span></button>)}
      </div>
      {expanded && <div className="map-modal" role="dialog" aria-modal="true" aria-label={t.zoom}><button className="modal-close" onClick={() => setExpanded(false)}>{t.close} ×</button><CampusMap stopIndex={active} variant="tour" language={language} expanded /></div>}
    </main>
  );
}

function PlaceholderPage({ route, language }: { route: RouteKey; language: Language }) {
  const t = copy[language];
  return (
    <main className="placeholder-page"><p className="eyebrow">{t.nav[route]}</p><h1>{t.placeholderTitle}</h1><p>{t.placeholderBody}</p>
      <button className="primary-cta" onClick={() => goTo("intro")}><ArrowIcon direction="left" />{t.backIntro}</button>
    </main>
  );
}

export default function AmbassadorsApp() {
  const [language, setLanguage] = useState<Language>("ko");
  const [route, setRoute] = useState<RouteKey>("intro");
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash());
    if (!window.location.hash) window.location.hash = "#/intro";
    syncRoute(); window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("sshs-session");
    if (saved) {
      try {
        // Session storage is the external session source for the lightweight REST auth client.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSession(JSON.parse(saved));
      } catch { window.sessionStorage.removeItem("sshs-session"); }
    }
  }, []);

  const updateSession = (next: UserSession | null) => {
    setSession(next);
    if (next) window.sessionStorage.setItem("sshs-session", JSON.stringify(next));
    else window.sessionStorage.removeItem("sshs-session");
  };

  const content = useMemo(() => {
    if (route === "intro") return <IntroPage language={language} />;
    if (route === "tour") return <TourPage language={language} session={session} />;
    if (route === "survey") return <SurveyPage language={language} session={session} />;
    if (route === "data") return <DataPage language={language} session={session} />;
    if (route === "login") return <LoginPage language={language} session={session} setSession={updateSession} />;
    if (route === "admin") return <AdminPage language={language} session={session} />;
    return <PlaceholderPage route={route} language={language} />;
  }, [route, language, session]);

  return <div className="site-shell"><Header language={language} onLanguage={() => setLanguage((value) => value === "ko" ? "en" : "ko")} route={route} session={session} onLogout={() => { updateSession(null); goTo("intro"); }} />{content}</div>;
}
