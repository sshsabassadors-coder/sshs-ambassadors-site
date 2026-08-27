export type AuthRole = "member" | "admin";

export type TourStopNoteImage = {
  storage_path: string;
  original_name: string;
  sort_order: number;
};

export type TourStopNote = {
  id: string;
  tour_stop_slug: string;
  author_id: string;
  body_ko: string;
  body_en: string;
  is_published: boolean;
  created_at: string;
  tour_stop_note_images?: TourStopNoteImage[];
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
  role: AuthRole;
};

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const nextPublicUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const nextPublicKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined;
const supabaseUrl = (nextPublicUrl || viteEnv?.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = nextPublicKey || viteEnv?.VITE_SUPABASE_ANON_KEY || "";

export const hasSupabaseConfig = Boolean(supabaseUrl && anonKey);

async function parseError(response: Response) {
  const body = await response.json().catch(() => ({}));
  return body?.msg || body?.message || body?.error_description || `Request failed (${response.status})`;
}

function baseHeaders(token?: string) {
  return {
    apikey: anonKey,
    Authorization: `Bearer ${token || anonKey}`,
    "Content-Type": "application/json",
  };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  if (!hasSupabaseConfig) throw new Error("Supabase is not configured.");
  const response = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: baseHeaders(), body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const auth = await response.json();
  const profileResponse = await fetch(`${supabaseUrl}/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(auth.user.id)}&limit=1`, { headers: baseHeaders(auth.access_token) });
  if (!profileResponse.ok) throw new Error(await parseError(profileResponse));
  const profiles = await profileResponse.json();
  const role = profiles[0]?.role;
  if (role !== "member" && role !== "admin") throw new Error("This account has no site role.");
  return { accessToken: auth.access_token, refreshToken: auth.refresh_token, expiresAt: Date.now() + auth.expires_in * 1000, email: auth.user.email, role };
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  if (!hasSupabaseConfig) throw new Error("Supabase is not configured.");
  const response = await fetch(`${supabaseUrl}/auth/v1/recover`, { method: "POST", headers: baseHeaders(), body: JSON.stringify({ email, redirect_to: redirectTo }) });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function submitSurveyResponse(surveyId: string, answers: Record<string, unknown>) {
  if (!hasSupabaseConfig) return { demo: true };
  const response = await fetch(`${supabaseUrl}/functions/v1/submit-survey`, { method: "POST", headers: baseHeaders(), body: JSON.stringify({ surveyId, answers }) });
  if (!response.ok) throw new Error(await parseError(response));
  return response.json();
}

export async function uploadArchiveFile(file: File, token: string, entryId: string, onProgress?: (value: number) => void) {
  if (!hasSupabaseConfig) {
    onProgress?.(100);
    return { path: `demo/${file.name}`, size: file.size, type: file.type, demo: true };
  }
  onProgress?.(15);
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const path = `${entryId}/${crypto.randomUUID()}-${safeName}`;
  const response = await fetch(`${supabaseUrl}/storage/v1/object/archive-files/${path}`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  if (!response.ok) throw new Error(await parseError(response));
  onProgress?.(100);
  return { path, size: file.size, type: file.type };
}

export async function getTourStopNotes(slug: string, token?: string): Promise<TourStopNote[]> {
  if (!hasSupabaseConfig) return [];
  const fields = "id,tour_stop_slug,author_id,body_ko,body_en,is_published,created_at,tour_stop_note_images(storage_path,original_name,sort_order)";
  const response = await fetch(`${supabaseUrl}/rest/v1/tour_stop_notes?select=${encodeURIComponent(fields)}&tour_stop_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc`, {
    headers: baseHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = await response.json() as TourStopNote[];
  return rows.map((row) => ({
    ...row,
    tour_stop_note_images: [...(row.tour_stop_note_images || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function addTourStopNote(slug: string, bodyKo: string, bodyEn: string, token: string): Promise<TourStopNote> {
  if (!hasSupabaseConfig) {
    const demoId = typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return {
      id: demoId, tour_stop_slug: slug, author_id: "demo-member",
      body_ko: bodyKo, body_en: bodyEn, is_published: false, created_at: new Date().toISOString(),
    };
  }
  const response = await fetch(`${supabaseUrl}/rest/v1/tour_stop_notes`, {
    method: "POST",
    headers: { ...baseHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify({ tour_stop_slug: slug, body_ko: bodyKo, body_en: bodyEn }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = await response.json();
  return rows[0];
}

function encodedStoragePath(path: string) {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

export function tourImagePublicUrl(path: string) {
  return `${supabaseUrl}/storage/v1/object/public/tour-images/${encodedStoragePath(path)}`;
}

export async function addTourStopNoteWithImages(
  slug: string,
  bodyKo: string,
  bodyEn: string,
  images: File[],
  token: string,
  publishNow: boolean,
): Promise<TourStopNote> {
  if (!hasSupabaseConfig) throw new Error("Supabase is not configured.");
  if (!token) throw new Error("Sign in is required.");
  if (images.length > 10) throw new Error("Up to 10 images can be added to one note.");

  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  for (const image of images) {
    if (!allowedTypes.has(image.type)) throw new Error("Photos must be JPG, PNG, or WebP files.");
    if (image.size > 10 * 1024 * 1024) throw new Error("Each image must be 10 MB or smaller.");
  }

  const noteResponse = await fetch(`${supabaseUrl}/rest/v1/tour_stop_notes`, {
    method: "POST",
    headers: { ...baseHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify({
      tour_stop_slug: slug,
      body_ko: bodyKo,
      body_en: bodyEn,
      is_published: publishNow,
    }),
  });
  if (!noteResponse.ok) throw new Error(await parseError(noteResponse));
  const noteRows = await noteResponse.json() as TourStopNote[];
  const note = noteRows[0];
  if (!note) throw new Error("The note was not returned after saving.");

  const uploaded: TourStopNoteImage[] = [];
  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "-") || `image-${index + 1}`;
    const path = `tour-notes/${note.id}/${crypto.randomUUID()}-${safeName}`;
    const uploadResponse = await fetch(`${supabaseUrl}/storage/v1/object/tour-images/${encodedStoragePath(path)}`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": image.type,
        "x-upsert": "false",
      },
      body: image,
    });
    if (!uploadResponse.ok) throw new Error(await parseError(uploadResponse));
    uploaded.push({ storage_path: path, original_name: image.name, sort_order: index });
  }

  if (uploaded.length > 0) {
    const metadataResponse = await fetch(`${supabaseUrl}/rest/v1/tour_stop_note_images`, {
      method: "POST",
      headers: { ...baseHeaders(token), Prefer: "return=minimal" },
      body: JSON.stringify(uploaded.map((image) => ({ note_id: note.id, ...image }))),
    });
    if (!metadataResponse.ok) throw new Error(await parseError(metadataResponse));
  }

  return { ...note, tour_stop_note_images: uploaded };
}

export async function deleteTourStopNote(id: string, token: string) {
  if (!hasSupabaseConfig) return;
  const response = await fetch(`${supabaseUrl}/rest/v1/tour_stop_notes?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE", headers: baseHeaders(token),
  });
  if (!response.ok) throw new Error(await parseError(response));
}

export async function setTourStopNotePublished(id: string, isPublished: boolean, token: string): Promise<TourStopNote> {
  if (!hasSupabaseConfig) throw new Error("Publishing requires a configured Supabase project.");
  const response = await fetch(`${supabaseUrl}/rest/v1/tour_stop_notes?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...baseHeaders(token), Prefer: "return=representation" },
    body: JSON.stringify({ is_published: isPublished }),
  });
  if (!response.ok) throw new Error(await parseError(response));
  const rows = await response.json();
  return rows[0];
}
