import { getChatGPTUser } from "../../chatgpt-auth";

export const dynamic = "force-dynamic";

const createRoutes = `CREATE TABLE IF NOT EXISTS tour_routes (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT NOT NULL,
  sort_index INTEGER NOT NULL, created_at TEXT NOT NULL
)`;
const createNotes = `CREATE TABLE IF NOT EXISTS tour_notes (
  id TEXT PRIMARY KEY, route_id TEXT NOT NULL, stop_slug TEXT NOT NULL,
  body_ko TEXT NOT NULL, body_en TEXT NOT NULL DEFAULT '',
  image_key TEXT, image_name TEXT, author_email TEXT NOT NULL, created_at TEXT NOT NULL
)`;
const createNoteImages = `CREATE TABLE IF NOT EXISTS tour_note_images (
  id TEXT PRIMARY KEY, note_id TEXT NOT NULL, image_key TEXT NOT NULL,
  image_name TEXT NOT NULL, sort_index INTEGER NOT NULL, created_at TEXT NOT NULL
)`;
const createArchive = `CREATE TABLE IF NOT EXISTS archive_entries (
  id TEXT PRIMARY KEY, year INTEGER NOT NULL, date TEXT NOT NULL,
  title_ko TEXT NOT NULL, title_en TEXT NOT NULL DEFAULT '',
  summary_ko TEXT NOT NULL, summary_en TEXT NOT NULL DEFAULT '',
  file_key TEXT, file_name TEXT, file_type TEXT, file_size INTEGER,
  author_email TEXT NOT NULL, created_at TEXT NOT NULL
)`;
const noteIndex = "CREATE INDEX IF NOT EXISTS tour_notes_route_stop_idx ON tour_notes(route_id, stop_slug, created_at)";
const noteImageIndex = "CREATE INDEX IF NOT EXISTS tour_note_images_note_idx ON tour_note_images(note_id, sort_index)";

function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

async function runtimeEnv() {
  return (await import("cloudflare:workers")).env;
}

async function ready(runtime: Awaited<ReturnType<typeof runtimeEnv>>) {
  if (!runtime.DB) throw new Error("Content storage is not available yet.");
  await runtime.DB.batch([
    runtime.DB.prepare(createRoutes), runtime.DB.prepare(createNotes),
    runtime.DB.prepare(createNoteImages), runtime.DB.prepare(createArchive),
    runtime.DB.prepare(noteIndex), runtime.DB.prepare(noteImageIndex),
  ]);
  await runtime.DB.prepare("INSERT OR IGNORE INTO tour_routes (id,name,color,sort_index,created_at) VALUES (?,?,?,?,?)")
    .bind("tour-1", "Tour 1", "#ff2d8d", 1, new Date().toISOString()).run();
}

function fileUrl(key: string | null) {
  return key ? `/api/file?key=${encodeURIComponent(key)}` : null;
}

export async function GET(request: Request) {
  try {
    const runtime = await runtimeEnv(); await ready(runtime);
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind");
    if (kind === "routes") {
      const result = await runtime.DB.prepare("SELECT id,name,color,sort_index FROM tour_routes ORDER BY sort_index ASC").all();
      return response({ items: result.results });
    }
    if (kind === "notes") {
      const route = url.searchParams.get("route") || "tour-1";
      const stop = url.searchParams.get("stop") || "";
      const result = await runtime.DB.prepare("SELECT * FROM tour_notes WHERE route_id=? AND stop_slug=? ORDER BY created_at DESC")
        .bind(route, stop).all();
      const items = await Promise.all(result.results.map(async (item: Record<string, unknown>) => {
        const images = await runtime.DB.prepare("SELECT image_key,image_name FROM tour_note_images WHERE note_id=? ORDER BY sort_index ASC")
          .bind(item.id).all<{ image_key: string; image_name: string }>();
        const imageUrls = images.results.length > 0 ? images.results.map((image) => fileUrl(image.image_key) as string) : item.image_key ? [fileUrl(item.image_key as string) as string] : [];
        const imageNames = images.results.length > 0 ? images.results.map((image) => image.image_name) : item.image_name ? [String(item.image_name)] : [];
        return { ...item, image_url: imageUrls[0] || null, image_name: imageNames[0] || null, image_urls: imageUrls, image_names: imageNames };
      }));
      return response({ items });
    }
    if (kind === "archive") {
      const result = await runtime.DB.prepare("SELECT * FROM archive_entries ORDER BY date DESC, created_at DESC").all();
      return response({ items: result.results.map((item: Record<string, unknown>) => ({ ...item, file_url: fileUrl(item.file_key as string | null) })) });
    }
    return response({ error: "Unknown content type." }, 400);
  } catch (cause) {
    return response({ error: cause instanceof Error ? cause.message : "Could not load content." }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const runtime = await runtimeEnv(); await ready(runtime);
    const user = await getChatGPTUser();
    if (!user) return response({ error: "Sign in is required." }, 401);
    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json() as { kind?: string; name?: string; color?: string };
      if (body.kind !== "route") return response({ error: "Unknown action." }, 400);
      const row = await runtime.DB.prepare("SELECT COALESCE(MAX(sort_index),0) AS max_index FROM tour_routes").first<{ max_index: number }>();
      const index = Number(row?.max_index || 0) + 1;
      const item = { id: `tour-${index}`, name: body.name?.trim() || `Tour ${index}`, color: body.color || "#005ce6", sort_index: index };
      await runtime.DB.prepare("INSERT INTO tour_routes (id,name,color,sort_index,created_at) VALUES (?,?,?,?,?)")
        .bind(item.id, item.name, item.color, item.sort_index, new Date().toISOString()).run();
      return response({ item }, 201);
    }

    const form = await request.formData();
    const kind = String(form.get("kind") || "");
    if (kind === "note") {
      const bodyKo = String(form.get("bodyKo") || "").trim();
      const bodyEn = String(form.get("bodyEn") || "").trim();
      const routeId = String(form.get("routeId") || "tour-1");
      const stopSlug = String(form.get("stopSlug") || "");
      if (!bodyKo || !stopSlug) return response({ error: "A location and description are required." }, 400);
      const legacyImage = form.get("image");
      const images = form.getAll("images").filter((image): image is File => image instanceof File && image.size > 0);
      if (images.length === 0 && legacyImage instanceof File && legacyImage.size > 0) images.push(legacyImage);
      if (images.length > 10) return response({ error: "Up to 10 images can be added to one note." }, 400);
      const uploadedImages: { key: string; name: string }[] = [];
      for (const image of images) {
        if (!image.type.startsWith("image/") || image.size > 10 * 1024 * 1024) return response({ error: "Each image must be 10 MB or smaller." }, 400);
        const key = `tour-notes/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        await runtime.BUCKET.put(key, image.stream(), { httpMetadata: { contentType: image.type } });
        uploadedImages.push({ key, name: image.name });
      }
      const imageKey = uploadedImages[0]?.key || null; const imageName = uploadedImages[0]?.name || null;
      const now = new Date().toISOString(); const id = crypto.randomUUID();
      await runtime.DB.prepare("INSERT INTO tour_notes (id,route_id,stop_slug,body_ko,body_en,image_key,image_name,author_email,created_at) VALUES (?,?,?,?,?,?,?,?,?)")
        .bind(id, routeId, stopSlug, bodyKo, bodyEn, imageKey, imageName, user.email, now).run();
      if (uploadedImages.length > 0) {
        await runtime.DB.batch(uploadedImages.map((image, index) => runtime.DB.prepare("INSERT INTO tour_note_images (id,note_id,image_key,image_name,sort_index,created_at) VALUES (?,?,?,?,?,?)")
          .bind(crypto.randomUUID(), id, image.key, image.name, index, now)));
      }
      const imageUrls = uploadedImages.map((image) => fileUrl(image.key) as string);
      const imageNames = uploadedImages.map((image) => image.name);
      return response({ item: { id, route_id: routeId, stop_slug: stopSlug, body_ko: bodyKo, body_en: bodyEn, image_url: imageUrls[0] || null, image_name: imageNames[0] || null, image_urls: imageUrls, image_names: imageNames, author_email: user.email, created_at: now } }, 201);
    }
    if (kind === "archive") {
      const titleKo = String(form.get("titleKo") || "").trim();
      const titleEn = String(form.get("titleEn") || "").trim();
      const summaryKo = String(form.get("summaryKo") || "").trim();
      const summaryEn = String(form.get("summaryEn") || "").trim();
      const year = Number(form.get("year")) || new Date().getFullYear();
      if (!titleKo || !summaryKo) return response({ error: "A Korean title and summary are required." }, 400);
      const file = form.get("file");
      let fileKey: string | null = null; let fileName: string | null = null; let fileType: string | null = null; let fileSize: number | null = null;
      if (file instanceof File && file.size > 0) {
        if (file.size > 25 * 1024 * 1024) return response({ error: "Files must be 25 MB or smaller." }, 400);
        fileName = file.name; fileType = file.type; fileSize = file.size;
        fileKey = `archive/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
        await runtime.BUCKET.put(fileKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
      }
      const now = new Date().toISOString(); const id = crypto.randomUUID(); const date = now.slice(0, 10);
      await runtime.DB.prepare("INSERT INTO archive_entries (id,year,date,title_ko,title_en,summary_ko,summary_en,file_key,file_name,file_type,file_size,author_email,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(id, year, date, titleKo, titleEn, summaryKo, summaryEn, fileKey, fileName, fileType, fileSize, user.email, now).run();
      return response({ item: { id, year, date, title_ko: titleKo, title_en: titleEn, summary_ko: summaryKo, summary_en: summaryEn, file_url: fileUrl(fileKey), file_name: fileName, file_type: fileType, file_size: fileSize } }, 201);
    }
    return response({ error: "Unknown action." }, 400);
  } catch (cause) {
    return response({ error: cause instanceof Error ? cause.message : "Could not save content." }, 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const runtime = await runtimeEnv(); await ready(runtime);
    const user = await getChatGPTUser();
    if (!user) return response({ error: "Sign in is required." }, 401);
    const body = await request.json() as { kind?: string; id?: string; color?: string };
    if (body.kind !== "route" || !body.id || !body.color) return response({ error: "Invalid route update." }, 400);
    await runtime.DB.prepare("UPDATE tour_routes SET color=? WHERE id=?").bind(body.color, body.id).run();
    const item = await runtime.DB.prepare("SELECT id,name,color,sort_index FROM tour_routes WHERE id=?").bind(body.id).first();
    return response({ item });
  } catch (cause) {
    return response({ error: cause instanceof Error ? cause.message : "Could not update route." }, 500);
  }
}
