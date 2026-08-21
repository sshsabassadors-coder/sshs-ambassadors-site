export type StoredTourNote = {
  id: string;
  route_id: string;
  stop_slug: string;
  body_ko: string;
  body_en: string;
  image_url: string | null;
  image_name: string | null;
  image_urls?: string[];
  image_names?: string[];
  author_email: string;
  created_at: string;
};

export type StoredTourRoute = {
  id: string;
  name: string;
  color: string;
  sort_index: number;
};

export type StoredArchiveEntry = {
  id: string;
  year: number;
  date: string;
  title_ko: string;
  title_en: string;
  summary_ko: string;
  summary_en: string;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
};

async function json<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.error || `Request failed (${response.status})`);
  return body as T;
}

export async function loadTourNotes(routeId: string, stopSlug: string) {
  return json<{ items: StoredTourNote[] }>(await fetch(`/api/content?kind=notes&route=${encodeURIComponent(routeId)}&stop=${encodeURIComponent(stopSlug)}`));
}

export async function createTourNote(routeId: string, stopSlug: string, bodyKo: string, bodyEn: string, images: File[] = []) {
  const form = new FormData();
  form.set("kind", "note"); form.set("routeId", routeId); form.set("stopSlug", stopSlug);
  form.set("bodyKo", bodyKo); form.set("bodyEn", bodyEn);
  images.forEach((image) => form.append("images", image));
  return json<{ item: StoredTourNote }>(await fetch("/api/content", { method: "POST", body: form }));
}

export async function loadTourRoutes() {
  return json<{ items: StoredTourRoute[] }>(await fetch("/api/content?kind=routes"));
}

export async function createTourRoute(name: string, color: string) {
  return json<{ item: StoredTourRoute }>(await fetch("/api/content", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "route", name, color }),
  }));
}

export async function updateTourRoute(id: string, color: string) {
  return json<{ item: StoredTourRoute }>(await fetch("/api/content", {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "route", id, color }),
  }));
}

export async function loadArchiveEntries() {
  return json<{ items: StoredArchiveEntry[] }>(await fetch("/api/content?kind=archive"));
}

export async function createArchiveEntry(input: { year: number; titleKo: string; titleEn: string; summaryKo: string; summaryEn: string; file?: File }) {
  const form = new FormData();
  form.set("kind", "archive"); form.set("year", String(input.year));
  form.set("titleKo", input.titleKo); form.set("titleEn", input.titleEn);
  form.set("summaryKo", input.summaryKo); form.set("summaryEn", input.summaryEn);
  if (input.file) form.set("file", input.file);
  return json<{ item: StoredArchiveEntry }>(await fetch("/api/content", { method: "POST", body: form }));
}
