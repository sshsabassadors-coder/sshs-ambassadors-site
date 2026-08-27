import { createClient, type AuthChangeEvent, type Session } from "@supabase/supabase-js";

export type AuthRole = "member" | "admin";

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  email: string;
  role: AuthRole;
};

export type TourStopNoteImage = {
  storage_path: string;
  original_name: string;
  sort_order: number;
};

export type TourStopNote = {
  id: string;
  route_id: string;
  tour_stop_slug: string;
  author_id: string;
  body_ko: string;
  body_en: string;
  is_published: boolean;
  created_at: string;
  tour_stop_note_images?: TourStopNoteImage[];
};

export type TourRouteStopRecord = {
  id: string;
  route_id: string;
  stop_slug: string;
  title_ko: string;
  title_en: string;
  is_published: boolean;
  sort_index: number;
};

export type TourRouteRecord = {
  id: string;
  name: string;
  color: string;
  sort_index: number;
  is_published: boolean;
  tour_route_stops: TourRouteStopRecord[];
};

export type SurveyQuestionRecord = {
  id: string;
  survey_id: string;
  question_key: string;
  label_ko: string;
  label_en: string;
  question_type: "short" | "long" | "single" | "multiple" | "scale" | "yesno";
  is_required: boolean;
  options: unknown[];
  condition_question_key: string | null;
  condition_equals: string | null;
  sort_order: number;
};

export type SurveyRecord = {
  id: string;
  survey_number: number;
  slug: string;
  title_ko: string;
  title_en: string;
  description_ko: string;
  description_en: string;
  status: "published" | "closed" | "draft";
  opens_at: string | null;
  created_at: string;
  survey_questions: SurveyQuestionRecord[];
};

export type SurveyResultRecord = {
  id: string;
  submittedAt: string;
  satisfaction: number | null;
  language: string;
  english: number | null;
  knowledge: number | null;
  comment: string;
};

export type ArchiveAttachmentRecord = {
  id: string;
  entry_id: string | null;
  storage_path: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  signed_url?: string;
};

export type ArchiveEntryRecord = {
  id: string;
  collection_id: string;
  entry_date: string;
  year: number;
  title_ko: string;
  title_en: string;
  subtitle_ko: string;
  subtitle_en: string;
  summary_ko: string;
  summary_en: string;
  is_published: boolean;
  archive_attachments: ArchiveAttachmentRecord[];
};

export type ArchiveCollectionRecord = {
  id: string;
  slug: string;
  title_ko: string;
  title_en: string;
  summary_ko: string;
  summary_en: string;
  accent_color: string;
  sort_order: number;
  is_published: boolean;
  archive_entries: ArchiveEntryRecord[];
};

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const nextPublicUrl = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_URL : undefined;
const nextPublicKey = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined;
const supabaseUrl = (nextPublicUrl || viteEnv?.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const anonKey = nextPublicKey || viteEnv?.VITE_SUPABASE_ANON_KEY || "";

export const hasSupabaseConfig = Boolean(supabaseUrl && anonKey);

const client = hasSupabaseConfig
  ? createClient(supabaseUrl, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

function configuredClient() {
  if (!client) throw new Error("Supabase is not configured.");
  return client;
}

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  return fallback;
}

async function roleForUser(userId: string): Promise<AuthRole> {
  const { data, error } = await configuredClient().from("profiles").select("role").eq("id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (data?.role !== "member" && data?.role !== "admin") throw new Error("This account has no site role.");
  return data.role;
}

async function hydrateSession(session: Session): Promise<AuthSession> {
  const email = session.user.email;
  if (!email) throw new Error("This account has no email address.");
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresAt: (session.expires_at || 0) * 1000,
    email,
    role: await roleForUser(session.user.id),
  };
}

export async function signInWithPassword(email: string, password: string): Promise<AuthSession> {
  const { data, error } = await configuredClient().auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  if (!data.session) throw new Error("The sign-in session was not returned.");
  return hydrateSession(data.session);
}

export async function getCurrentAuthSession(): Promise<AuthSession | null> {
  if (!client) return null;
  const { data, error } = await client.auth.getSession();
  if (error) throw new Error(error.message);
  return data.session ? hydrateSession(data.session) : null;
}

export function onAuthSessionChange(callback: (session: AuthSession | null, event: AuthChangeEvent) => void) {
  if (!client) return () => undefined;
  const { data } = client.auth.onAuthStateChange((event, session) => {
    // Defer queries made from an auth callback to avoid locking the auth client.
    window.setTimeout(() => {
      if (!session) {
        callback(null, event);
        return;
      }
      hydrateSession(session)
        .then((hydrated) => callback(hydrated, event))
        .catch(() => callback(null, event));
    }, 0);
  });
  return () => data.subscription.unsubscribe();
}

export async function signOut() {
  if (!client) return;
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
}

export async function requestPasswordReset(email: string, redirectTo: string) {
  const { error } = await configuredClient().auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new Error(error.message);
}

export async function updatePassword(password: string) {
  const { error } = await configuredClient().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}

export async function submitSurveyResponse(surveyId: string, answers: Record<string, unknown>) {
  if (!client) return { demo: true };
  const { data, error } = await client.functions.invoke("submit-survey", { body: { surveyId, answers } });
  if (error) throw new Error(error.message);
  return data;
}

export async function getTourStopNotes(routeId: string, slug: string): Promise<TourStopNote[]> {
  if (!client) return [];
  const fields = "id,route_id,tour_stop_slug,author_id,body_ko,body_en,is_published,created_at,tour_stop_note_images(storage_path,original_name,sort_order)";
  const { data, error } = await client
    .from("tour_stop_notes")
    .select(fields)
    .eq("route_id", routeId)
    .eq("tour_stop_slug", slug)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return ((data || []) as unknown as TourStopNote[]).map((row) => ({
    ...row,
    tour_stop_note_images: [...(row.tour_stop_note_images || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

function validateTourImages(images: File[]) {
  if (images.length > 10) throw new Error("Up to 10 images can be added to one note.");
  const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
  for (const image of images) {
    if (!allowedTypes.has(image.type)) throw new Error("Photos must be JPG, PNG, or WebP files.");
    if (image.size > 10 * 1024 * 1024) throw new Error("Each image must be 10 MB or smaller.");
  }
}

export function tourImagePublicUrl(path: string) {
  if (!client) return "";
  return client.storage.from("tour-images").getPublicUrl(path).data.publicUrl;
}

export async function addTourStopNoteWithImages(
  routeId: string,
  slug: string,
  bodyKo: string,
  bodyEn: string,
  images: File[],
  publishNow: boolean,
): Promise<TourStopNote> {
  const supabase = configuredClient();
  validateTourImages(images);
  const { data: authData } = await supabase.auth.getSession();
  if (!authData.session) throw new Error("Sign in is required.");

  const { data: noteData, error: noteError } = await supabase
    .from("tour_stop_notes")
    .insert({ route_id: routeId, tour_stop_slug: slug, body_ko: bodyKo, body_en: bodyEn, is_published: publishNow })
    .select("id,route_id,tour_stop_slug,author_id,body_ko,body_en,is_published,created_at")
    .single();
  if (noteError) throw new Error(noteError.message);
  const note = noteData as TourStopNote;
  const uploadedPaths: string[] = [];

  try {
    const imageRows: Array<TourStopNoteImage & { note_id: string }> = [];
    for (let index = 0; index < images.length; index += 1) {
      const image = images[index];
      const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, "-") || `image-${index + 1}`;
      const path = `tour-notes/${note.id}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from("tour-images").upload(path, image, { contentType: image.type, upsert: false });
      if (error) throw new Error(error.message);
      uploadedPaths.push(path);
      imageRows.push({ note_id: note.id, storage_path: path, original_name: image.name, sort_order: index });
    }
    if (imageRows.length) {
      const { error } = await supabase.from("tour_stop_note_images").insert(imageRows);
      if (error) throw new Error(error.message);
    }
    return { ...note, tour_stop_note_images: imageRows };
  } catch (cause) {
    if (uploadedPaths.length) await supabase.storage.from("tour-images").remove(uploadedPaths);
    await supabase.from("tour_stop_notes").delete().eq("id", note.id);
    throw new Error(errorMessage(cause, "Could not save the note and its photos."));
  }
}

export async function deleteTourStopNote(id: string) {
  const supabase = configuredClient();
  const { data: images } = await supabase.from("tour_stop_note_images").select("storage_path").eq("note_id", id);
  const paths = (images || []).map((image) => image.storage_path as string);
  if (paths.length) {
    const { error: storageError } = await supabase.storage.from("tour-images").remove(paths);
    if (storageError) throw new Error(storageError.message);
  }
  const { error } = await supabase.from("tour_stop_notes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function setTourStopNotePublished(id: string, isPublished: boolean): Promise<TourStopNote> {
  const { data, error } = await configuredClient()
    .from("tour_stop_notes")
    .update({ is_published: isPublished })
    .eq("id", id)
    .select("id,route_id,tour_stop_slug,author_id,body_ko,body_en,is_published,created_at")
    .single();
  if (error) throw new Error(error.message);
  return data as TourStopNote;
}

export async function getTourRoutes(): Promise<TourRouteRecord[]> {
  if (!client) return [];
  const { data, error } = await client
    .from("tour_routes")
    .select("id,name,color,sort_index,is_published,tour_route_stops(id,route_id,stop_slug,title_ko,title_en,is_published,sort_index)")
    .order("sort_index");
  if (error) throw new Error(error.message);
  return ((data || []) as unknown as TourRouteRecord[]).map((route) => ({
    ...route,
    tour_route_stops: [...(route.tour_route_stops || [])].sort((a, b) => a.sort_index - b.sort_index),
  }));
}

export async function insertTourRoute(name: string, color: string, sortIndex: number) {
  const id = `tour-${Date.now().toString(36)}`;
  const { data, error } = await configuredClient()
    .from("tour_routes")
    .insert({ id, name, color, sort_index: sortIndex, is_published: true })
    .select("id,name,color,sort_index,is_published")
    .single();
  if (error) throw new Error(error.message);
  return { ...(data as Omit<TourRouteRecord, "tour_route_stops">), tour_route_stops: [] };
}

export async function patchTourRoute(id: string, values: Partial<Pick<TourRouteRecord, "name" | "color" | "is_published">>) {
  const { data, error } = await configuredClient().from("tour_routes").update(values).eq("id", id).select("id,name,color,sort_index,is_published").single();
  if (error) throw new Error(error.message);
  return data;
}

export async function removeTourRoute(id: string) {
  const { error } = await configuredClient().from("tour_routes").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function insertTourRouteStop(input: Omit<TourRouteStopRecord, "id">) {
  const { data, error } = await configuredClient().from("tour_route_stops").insert(input).select("*").single();
  if (error) throw new Error(error.message);
  return data as TourRouteStopRecord;
}

export async function patchTourRouteStop(id: string, input: Partial<Pick<TourRouteStopRecord, "stop_slug" | "title_ko" | "title_en" | "is_published" | "sort_index">>) {
  const { data, error } = await configuredClient().from("tour_route_stops").update(input).eq("id", id).select("*").single();
  if (error) throw new Error(error.message);
  return data as TourRouteStopRecord;
}

export async function removeTourRouteStop(id: string) {
  const { error } = await configuredClient().from("tour_route_stops").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getSurveys(): Promise<SurveyRecord[]> {
  if (!client) return [];
  const { data, error } = await client
    .from("surveys")
    .select("id,survey_number,slug,title_ko,title_en,description_ko,description_en,status,opens_at,created_at,survey_questions(id,survey_id,question_key,label_ko,label_en,question_type,is_required,options,condition_question_key,condition_equals,sort_order)")
    .order("survey_number");
  if (error) throw new Error(error.message);
  return ((data || []) as unknown as SurveyRecord[]).map((survey) => ({
    ...survey,
    survey_questions: [...(survey.survey_questions || [])].sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function insertSurvey(input: {
  number: number;
  titleKo: string;
  titleEn: string;
  descriptionKo: string;
  descriptionEn: string;
  status: "published" | "draft";
  questions: Array<Omit<SurveyQuestionRecord, "id" | "survey_id">>;
}) {
  const supabase = configuredClient();
  const slug = `survey-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("surveys")
    .insert({ survey_number: input.number, slug, title_ko: input.titleKo, title_en: input.titleEn, description_ko: input.descriptionKo, description_en: input.descriptionEn, status: input.status })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const surveyId = data.id as string;
  const { error: questionError } = await supabase.from("survey_questions").insert(input.questions.map((question) => ({ ...question, survey_id: surveyId })));
  if (questionError) {
    await supabase.from("surveys").delete().eq("id", surveyId);
    throw new Error(questionError.message);
  }
  return surveyId;
}

export async function patchSurvey(id: string, input: { title_ko?: string; title_en?: string; status?: "published" | "closed" | "draft" }) {
  const { error } = await configuredClient().from("surveys").update(input).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removeSurvey(id: string) {
  const { error } = await configuredClient().from("surveys").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getSurveyResults(surveyId: string): Promise<SurveyResultRecord[]> {
  if (!client) return [];
  const { data: responses, error: responseError } = await client
    .from("survey_responses")
    .select("id,anonymous_code,submitted_at")
    .eq("survey_id", surveyId)
    .order("submitted_at", { ascending: false });
  if (responseError) throw new Error(responseError.message);
  if (!responses?.length) return [];
  const responseIds = responses.map((response) => response.id as string);
  const { data: answers, error: answerError } = await client
    .from("survey_answers")
    .select("response_id,value,survey_questions(question_key)")
    .in("response_id", responseIds);
  if (answerError) throw new Error(answerError.message);
  const answerMap = new Map<string, Record<string, unknown>>();
  for (const answer of (answers || []) as Array<{ response_id: string; value: unknown; survey_questions: { question_key: string } | Array<{ question_key: string }> | null }>) {
    const question = Array.isArray(answer.survey_questions) ? answer.survey_questions[0] : answer.survey_questions;
    if (!question) continue;
    answerMap.set(answer.response_id, { ...(answerMap.get(answer.response_id) || {}), [question.question_key]: answer.value });
  }
  return responses.map((response) => {
    const values = answerMap.get(response.id as string) || {};
    return {
      id: response.anonymous_code as string,
      submittedAt: new Date(response.submitted_at as string).toLocaleString(),
      satisfaction: typeof values.satisfaction === "number" ? values.satisfaction : null,
      language: typeof values.language === "string" ? values.language : "—",
      english: typeof values.english === "number" ? values.english : null,
      knowledge: typeof values.knowledge === "number" ? values.knowledge : null,
      comment: typeof values.comment === "string" ? values.comment : "",
    };
  });
}

function blockSummary(blocks: unknown) {
  const rows = Array.isArray(blocks) ? blocks as Array<{ block_type?: string; content?: Record<string, unknown>; sort_order?: number }> : [];
  const paragraph = [...rows].sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)).find((row) => row.block_type === "paragraph");
  return {
    ko: typeof paragraph?.content?.ko === "string" ? paragraph.content.ko : "",
    en: typeof paragraph?.content?.en === "string" ? paragraph.content.en : "",
  };
}

async function withSignedUrls(attachments: ArchiveAttachmentRecord[]) {
  if (!client || !attachments.length) return attachments;
  return Promise.all(attachments.map(async (attachment) => {
    const { data } = await client.storage.from("archive-files").createSignedUrl(attachment.storage_path, 3600);
    return { ...attachment, signed_url: data?.signedUrl };
  }));
}

export async function getArchiveCollections(): Promise<ArchiveCollectionRecord[]> {
  if (!client) return [];
  const { data, error } = await client
    .from("archive_collections")
    .select("id,slug,title_ko,title_en,summary_ko,summary_en,accent_color,sort_order,is_published,archive_entries(id,collection_id,entry_date,year,title_ko,title_en,subtitle_ko,subtitle_en,is_published,archive_blocks(block_type,content,sort_order),archive_attachments(id,entry_id,storage_path,original_name,mime_type,size_bytes,created_at))")
    .order("sort_order");
  if (error) throw new Error(error.message);
  const collections = (data || []) as unknown as Array<ArchiveCollectionRecord & { archive_entries: Array<ArchiveEntryRecord & { archive_blocks?: unknown }> }>;
  return Promise.all(collections.map(async (collection) => ({
    ...collection,
    archive_entries: await Promise.all([...(collection.archive_entries || [])]
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
      .map(async (entry) => {
        const summary = blockSummary(entry.archive_blocks);
        const { archive_blocks, ...rest } = entry;
        void archive_blocks;
        return { ...rest, summary_ko: summary.ko, summary_en: summary.en, archive_attachments: await withSignedUrls(entry.archive_attachments || []) };
      })),
  })));
}

async function uploadArchiveObject(file: File, folder: string, onProgress?: (value: number) => void) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-") || "file";
  const path = `${folder}/${crypto.randomUUID()}-${safeName}`;
  onProgress?.(20);
  const { error } = await configuredClient().storage.from("archive-files").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  onProgress?.(75);
  return path;
}

export async function uploadArchiveFile(file: File, entryId: string | null, onProgress?: (value: number) => void) {
  if (!client) {
    onProgress?.(100);
    return { path: `demo/${file.name}`, size: file.size, type: file.type, demo: true };
  }
  const supabase = configuredClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("Sign in is required.");
  const folder = entryId ? `entries/${entryId}` : `inbox/${userData.user.id}`;
  const path = await uploadArchiveObject(file, folder, onProgress);
  const { error } = await supabase.from("archive_attachments").insert({
    entry_id: entryId,
    uploader_id: userData.user.id,
    storage_path: path,
    original_name: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
  });
  if (error) {
    await supabase.storage.from("archive-files").remove([path]);
    throw new Error(error.message);
  }
  onProgress?.(100);
  return { path, size: file.size, type: file.type };
}

export async function insertArchiveEntry(input: {
  collectionId: string;
  year: number;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  file?: File;
}) {
  const supabase = configuredClient();
  const today = new Date();
  const entryDate = `${input.year}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data, error } = await supabase.from("archive_entries").insert({
    collection_id: input.collectionId,
    entry_date: entryDate,
    title_ko: input.titleKo,
    title_en: input.titleEn || input.titleKo,
    subtitle_ko: "관리자 등록 콘텐츠",
    subtitle_en: "Admin content",
    is_published: true,
  }).select("id").single();
  if (error) throw new Error(error.message);
  const entryId = data.id as string;
  try {
    const { error: blockError } = await supabase.from("archive_blocks").insert({ entry_id: entryId, block_type: "paragraph", content: { ko: input.summaryKo, en: input.summaryEn || input.summaryKo }, sort_order: 0 });
    if (blockError) throw new Error(blockError.message);
    if (input.file) await uploadArchiveFile(input.file, entryId);
    return entryId;
  } catch (cause) {
    await supabase.from("archive_entries").delete().eq("id", entryId);
    throw new Error(errorMessage(cause, "Could not create the archive entry."));
  }
}

export async function patchArchiveEntry(id: string, input: { year: number; titleKo: string; titleEn: string; summaryKo: string; summaryEn: string }) {
  const supabase = configuredClient();
  const entryDate = `${input.year}-01-01`;
  const { error } = await supabase.from("archive_entries").update({ entry_date: entryDate, title_ko: input.titleKo, title_en: input.titleEn || input.titleKo }).eq("id", id);
  if (error) throw new Error(error.message);
  const { data: block } = await supabase.from("archive_blocks").select("id").eq("entry_id", id).eq("block_type", "paragraph").order("sort_order").limit(1).maybeSingle();
  const content = { ko: input.summaryKo, en: input.summaryEn || input.summaryKo };
  const result = block
    ? await supabase.from("archive_blocks").update({ content }).eq("id", block.id)
    : await supabase.from("archive_blocks").insert({ entry_id: id, block_type: "paragraph", content, sort_order: 0 });
  if (result.error) throw new Error(result.error.message);
}

export async function removeArchiveEntry(id: string) {
  const supabase = configuredClient();
  const { data: attachments } = await supabase.from("archive_attachments").select("storage_path").eq("entry_id", id);
  const paths = (attachments || []).map((item) => item.storage_path as string);
  if (paths.length) await supabase.storage.from("archive-files").remove(paths);
  const { error } = await supabase.from("archive_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getPendingArchiveFiles(): Promise<ArchiveAttachmentRecord[]> {
  if (!client) return [];
  const { data, error } = await client.from("archive_attachments").select("id,entry_id,storage_path,original_name,mime_type,size_bytes,created_at").is("entry_id", null).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return withSignedUrls((data || []) as ArchiveAttachmentRecord[]);
}

export async function removePendingArchiveFile(file: ArchiveAttachmentRecord) {
  const supabase = configuredClient();
  const { error } = await supabase.storage.from("archive-files").remove([file.storage_path]);
  if (error) throw new Error(error.message);
  const { error: rowError } = await supabase.from("archive_attachments").delete().eq("id", file.id);
  if (rowError) throw new Error(rowError.message);
}
