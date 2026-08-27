"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import CampusMap from "./CampusMap";
import { createTourNote, loadTourNotes, loadTourRoutes, StoredTourNote, type StoredTourRoute } from "./contentApi";
import { copy, Language, RouteKey, TourStop, tourStops } from "./data";
import { AdminPage, DataPage, LoginPage, SurveyPage, UserSession } from "./PortalPages";
import { getCurrentAuthSession, onAuthSessionChange, signOut } from "./supabase";

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

function noteImages(note: StoredTourNote) {
  const urls = note.image_urls?.length ? note.image_urls : note.image_url ? [note.image_url] : [];
  const names = note.image_names?.length ? note.image_names : note.image_name ? [note.image_name] : [];
  return { urls, names };
}

function MemberNoteCard({ note, language, stop, stopIndex, stopCount }: { note: StoredTourNote; language: Language; stop: TourStop; stopIndex: number; stopCount: number }) {
  const langIndex = language === "ko" ? 0 : 1;
  const { urls, names } = noteImages(note);
  const description = language === "ko" ? note.body_ko || note.body_en : note.body_en || note.body_ko;
  const coverUrl = urls.at(-1) || null;
  const coverName = names.at(-1) || "";

  return <>
    {urls.map((imageUrl, imageIndex) => (
      <section className="tour-story-panel tour-photo-panel" key={`${note.id}-photo-${imageIndex}`} aria-label={`${stop.name[langIndex]} ${language === "ko" ? "사진" : "photo"} ${imageIndex + 1}`}>
        <article className="tour-photo-heading">
          <div className="stop-meta"><span>{stop.building[langIndex]}</span><span>{stop.floor[langIndex]}</span></div>
          <p className="stop-number">STOP {String(stopIndex + 1).padStart(2, "0")} / {stopCount}</p>
          <h3>{stop.name[langIndex]}</h3>
        </article>
        <figure className="tour-photo-frame">
          <img src={imageUrl} alt={names[imageIndex] || `${stop.name[langIndex]} ${language === "ko" ? "사진" : "photo"} ${imageIndex + 1}`} />
          <figcaption>{imageIndex + 1} / {urls.length}</figcaption>
        </figure>
      </section>
    ))}
    <section className={`tour-story-panel tour-description-panel ${coverUrl ? "" : "no-photo"}`} aria-label={`${stop.name[langIndex]} ${language === "ko" ? "설명" : "description"}`}>
      <figure className="tour-description-visual">
        {coverUrl ? <img src={coverUrl} alt={coverName || `${stop.name[langIndex]} ${language === "ko" ? "대표 사진" : "featured photo"}`} /> : <span>{stop.name[langIndex]}</span>}
      </figure>
      <article className="tour-description-card">
        <span>AMBASSADOR NOTE</span>
        <p>{description}</p>
      </article>
    </section>
  </>;
}

function TourStopStory({ routeId, stop, stopIndex, stopCount, mapStopIndex, language, session, onExpand }: { routeId: string; stop: TourStop; stopIndex: number; stopCount: number; mapStopIndex: number; language: Language; session: UserSession | null; onExpand: () => void }) {
  const [notes, setNotes] = useState<StoredTourNote[]>([]);
  const [editing, setEditing] = useState(false);
  const [bodyKo, setBodyKo] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [storyPage, setStoryPage] = useState(0);
  const storyTrack = useRef<HTMLDivElement>(null);
  const t = copy[language];
  const langIndex = language === "ko" ? 0 : 1;

  useEffect(() => {
    let active = true;
    loadTourNotes(routeId, stop.id, session?.token)
      .then(({ items }) => { if (active) setNotes(items ?? []); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [routeId, session?.token, stop.id]);

  const storyPageCount = 1 + notes.reduce((count, note) => count + noteImages(note).urls.length + 1, 0);

  const moveStory = (nextPage: number) => {
    const track = storyTrack.current;
    if (!track) return;
    const page = Math.max(0, Math.min(storyPageCount - 1, nextPage));
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({ left: page * track.clientWidth, behavior: reducedMotion ? "auto" : "smooth" });
  };

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
        note = (await createTourNote(routeId, stop.id, bodyKo.trim(), bodyEn.trim(), imageFiles, session.token, session.email, session.role === "admin")).item;
      } catch (cause) {
        if (!session.demo) throw cause;
        const imageUrls = imageFiles.map((image) => URL.createObjectURL(image));
        note = { id: `preview-${Date.now()}-${Math.random().toString(36).slice(2)}`, route_id: routeId, stop_slug: stop.id, body_ko: bodyKo.trim(), body_en: bodyEn.trim(), image_url: imageUrls[0] || null, image_name: imageFiles[0]?.name || null, image_urls: imageUrls, image_names: imageFiles.map((image) => image.name), author_email: session.email, created_at: new Date().toISOString(), is_published: false };
      }
      setNotes((items) => [note, ...items]); setBodyKo(""); setBodyEn(""); setImageFiles([]); setEditing(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this note.");
    } finally { setSaving(false); }
  };

  return (
    <div className="tour-stop-story">
      <div
        className="tour-story-track"
        ref={storyTrack}
        tabIndex={storyPageCount > 1 ? 0 : -1}
        aria-label={`${stop.name[langIndex]} ${language === "ko" ? "사진과 설명" : "photos and description"}`}
        onScroll={(event) => setStoryPage(Math.round(event.currentTarget.scrollLeft / Math.max(1, event.currentTarget.clientWidth)))}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); moveStory(storyPage - 1); }
          if (event.key === "ArrowRight") { event.preventDefault(); moveStory(storyPage + 1); }
        }}
      >
        <section className="tour-story-panel tour-overview-panel">
          <div className="tour-map-column">
            <div className="map-toolbar">
              <div className="legend"><span><i className="legend-dot" />{t.mapLegend}</span><span><i className="legend-line" />{t.routeLegend}</span></div>
              <button onClick={onExpand}>{t.zoom}<span>⛶</span></button>
            </div>
            <CampusMap stopIndex={mapStopIndex} variant="tour" language={language} /><p className="map-note">{t.floorPlan}</p>
          </div>
          <article className="stop-card">
            <div className="stop-meta"><span>{stop.building[langIndex]}</span><span>{stop.floor[langIndex]}</span></div>
            <p className="stop-number">STOP {String(stopIndex + 1).padStart(2, "0")} / {stopCount}</p>
            <h2>{stop.name[langIndex]}</h2>
            {(session || notes.length > 0) && <section className="member-notes" aria-label={language === "ko" ? "홍보단 장소 설명" : "Ambassador place notes"}>
              <div className="member-notes-heading">
                <div><span>MEMBER NOTES</span><strong>{language === "ko" ? "홍보단 설명" : "Ambassador notes"}</strong></div>
                <div className="member-note-actions">
                  {notes.length > 0 && <button type="button" onClick={() => moveStory(1)}>{language === "ko" ? "사진·설명 보기 →" : "View story →"}</button>}
                  {session && <button type="button" onClick={() => setEditing((value) => !value)}>{editing ? (language === "ko" ? "취소" : "Cancel") : (language === "ko" ? "+ 설명 추가" : "+ Add note")}</button>}
                </div>
              </div>
              {editing && <form className="member-note-form" onSubmit={submit}>
                <label>한국어 설명<textarea rows={3} maxLength={2000} value={bodyKo} onChange={(event) => setBodyKo(event.target.value)} required /></label>
                <label>English<textarea rows={3} maxLength={2000} value={bodyEn} onChange={(event) => setBodyEn(event.target.value)} /></label>
                <label className="member-image-field">{language === "ko" ? "사진" : "Photo"} <small>optional</small><input type="file" accept="image/*" multiple onChange={(event) => setImageFiles(Array.from(event.target.files || []))} /></label>
                <button className="member-note-submit" disabled={saving}>{saving ? (language === "ko" ? "저장 중…" : "Saving…") : (language === "ko" ? "설명 등록" : "Post note")}</button>
              </form>}
              {error && <p className="member-note-error" role="alert">{error}</p>}
            </section>}
          </article>
        </section>
        {notes.map((note) => <MemberNoteCard key={note.id} note={note} language={language} stop={stop} stopIndex={stopIndex} stopCount={stopCount} />)}
      </div>
      {storyPageCount > 1 && <div className="tour-story-controls" aria-label={language === "ko" ? "사진과 설명 이동" : "Story navigation"}>
        <button type="button" onClick={() => moveStory(storyPage - 1)} disabled={storyPage === 0} aria-label={language === "ko" ? "이전 화면" : "Previous panel"}>←</button>
        <span aria-live="polite">{storyPage + 1} / {storyPageCount}</span>
        <button type="button" onClick={() => moveStory(storyPage + 1)} disabled={storyPage >= storyPageCount - 1} aria-label={language === "ko" ? "다음 화면" : "Next panel"}>→</button>
      </div>}
    </div>
  );
}

function TourPage({ language, session }: { language: Language; session: UserSession | null }) {
  const t = copy[language];
  const [active, setActive] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [routeId, setRouteId] = useState("tour-1");
  const [routes, setRoutes] = useState<StoredTourRoute[]>([{
    id: "tour-1", name: "Tour 1", color: "#ff2d8d", sort_index: 1, is_published: true,
    stops: tourStops.map((stop, index) => ({ id: `fallback-${stop.id}`, route_id: "tour-1", stop_slug: stop.id, title_ko: stop.name[0], title_en: stop.name[1], published: true, sort_index: index + 1 })),
  }]);
  const containerRef = useRef<HTMLDivElement>(null);
  const langIndex = language === "ko" ? 0 : 1;
  const currentRoute = routes.find((item) => item.id === routeId) || routes[0] || { id: "tour-1", name: "Tour 1", color: "#ff2d8d", sort_index: 1, is_published: true, stops: [] };
  const routeStops = (currentRoute?.stops || []).filter((item) => item.published || session?.role === "admin").flatMap((item) => {
    const stop = tourStops.find((candidate) => candidate.id === item.stop_slug);
    return stop ? [{ ...stop, name: [item.title_ko || stop.name[0], item.title_en || stop.name[1]] as [string, string] }] : [];
  });

  useEffect(() => {
    let activeRequest = true;
    loadTourRoutes().then(({ items }) => {
      const available = items.filter((item) => (item.is_published || session?.role === "admin") && item.stops.length > 0);
      if (!activeRequest || !available.length) return;
      setRoutes(available);
      setRouteId((current) => available.some((item) => item.id === current) ? current : available[0].id);
    }).catch(() => undefined);
    return () => { activeRequest = false; };
  }, [session?.role]);

  const move = (index: number) => {
    const next = (index + routeStops.length) % routeStops.length;
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
  }, [routeStops.length]);

  return (
    <main className="tour-page">
      <div className="tour-intro-strip"><p className="tour-only-title">{t.tourLabel}</p>{routes.length > 1 && <select className="tour-route-select" value={routeId} onChange={(event) => { setRouteId(event.target.value); setActive(0); containerRef.current?.scrollTo({ top: 0 }); }} aria-label={language === "ko" ? "투어 루트 선택" : "Choose tour route"}>{routes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>}</div>
      <div className="tour-progress" aria-label={`Tour progress ${active + 1} of ${routeStops.length}`}><span style={{ width: `${routeStops.length ? ((active + 1) / routeStops.length) * 100 : 0}%`, background: currentRoute?.color }} /></div>
      <div className="tour-slides" ref={containerRef}>
        {routeStops.map((stop, index) => (
          <section className="tour-slide" key={stop.id} data-stop-index={index} aria-label={`${index + 1}. ${stop.name[langIndex]}`}>
            <TourStopStory routeId={currentRoute.id} stop={stop} stopIndex={index} stopCount={routeStops.length} mapStopIndex={Math.max(0, tourStops.findIndex((item) => item.id === stop.id))} language={language} session={session} onExpand={() => setExpanded(true)} />
          </section>
        ))}
      </div>
      <div className="stop-rail" aria-label="Tour stops">
        {routeStops.map((stop, index) => <button key={stop.id} className={index === active ? "active" : ""} onClick={() => move(index)} aria-label={`Go to stop ${index + 1}: ${stop.name[langIndex]}`}><span>{String(index + 1).padStart(2, "0")}</span></button>)}
      </div>
      {expanded && <div className="map-modal" role="dialog" aria-modal="true" aria-label={t.zoom}><button className="modal-close" onClick={() => setExpanded(false)}>{t.close} ×</button><CampusMap stopIndex={Math.max(0, tourStops.findIndex((item) => item.id === routeStops[active]?.id))} variant="tour" language={language} expanded /></div>}
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
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    const syncRoute = () => setRoute(routeFromHash());
    if (!window.location.hash) window.location.hash = "#/intro";
    syncRoute(); window.addEventListener("hashchange", syncRoute);
    return () => window.removeEventListener("hashchange", syncRoute);
  }, []);

  useEffect(() => {
    let active = true;
    getCurrentAuthSession().then((auth) => {
      if (active && auth) setSession({ email: auth.email, role: auth.role, token: auth.accessToken });
    }).catch(() => undefined);
    const unsubscribe = onAuthSessionChange((auth, event) => {
      if (!active) return;
      setSession(auth ? { email: auth.email, role: auth.role, token: auth.accessToken } : null);
      if (event === "PASSWORD_RECOVERY") { setRecoveryMode(true); goTo("login"); }
    });
    return () => { active = false; unsubscribe(); };
  }, []);

  const updateSession = (next: UserSession | null) => setSession(next);

  const content = useMemo(() => {
    if (route === "intro") return <IntroPage language={language} />;
    if (route === "tour") return <TourPage language={language} session={session} />;
    if (route === "survey") return <SurveyPage language={language} session={session} />;
    if (route === "data") return <DataPage language={language} session={session} />;
    if (route === "login") return <LoginPage language={language} session={session} setSession={updateSession} recoveryMode={recoveryMode} onRecoveryComplete={() => setRecoveryMode(false)} />;
    if (route === "admin") return <AdminPage language={language} session={session} />;
    return <PlaceholderPage route={route} language={language} />;
  }, [route, language, recoveryMode, session]);

  return <div className="site-shell"><Header language={language} onLanguage={() => setLanguage((value) => value === "ko" ? "en" : "ko")} route={route} session={session} onLogout={() => { signOut().catch(() => undefined); updateSession(null); goTo("intro"); }} />{content}</div>;
}
