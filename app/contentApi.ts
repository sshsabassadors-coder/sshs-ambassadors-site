import {
  addTourStopNoteWithImages,
  getArchiveCollections,
  getTourRoutes,
  getTourStopNotes,
  insertArchiveEntry,
  insertTourRoute,
  insertTourRouteStop,
  patchArchiveEntry,
  patchTourRoute,
  patchTourRouteStop,
  removeArchiveEntry,
  removeTourRoute,
  removeTourRouteStop,
  tourImagePublicUrl,
  type TourStopNote,
} from "./supabase";

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
  is_published: boolean;
};

export type StoredTourRouteStop = {
  id: string;
  route_id: string;
  stop_slug: string;
  title_ko: string;
  title_en: string;
  published: boolean;
  sort_index: number;
};

export type StoredTourRoute = {
  id: string;
  name: string;
  color: string;
  sort_index: number;
  is_published: boolean;
  stops: StoredTourRouteStop[];
};

export type StoredArchiveEntry = {
  id: string;
  collection_id: string;
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
  is_published: boolean;
};

function storedTourNote(note: TourStopNote, authorEmail = ""): StoredTourNote {
  const images = [...(note.tour_stop_note_images || [])].sort((a, b) => a.sort_order - b.sort_order);
  const imageUrls = images.map((image) => tourImagePublicUrl(image.storage_path));
  const imageNames = images.map((image) => image.original_name);
  return {
    id: note.id,
    route_id: note.route_id,
    stop_slug: note.tour_stop_slug,
    body_ko: note.body_ko,
    body_en: note.body_en,
    image_url: imageUrls[0] || null,
    image_name: imageNames[0] || null,
    image_urls: imageUrls,
    image_names: imageNames,
    author_email: authorEmail,
    created_at: note.created_at,
    is_published: note.is_published,
  };
}

export async function loadTourNotes(routeId: string, stopSlug: string, token?: string) {
  void token;
  const notes = await getTourStopNotes(routeId, stopSlug);
  return { items: notes.map((note) => storedTourNote(note)) };
}

export async function createTourNote(
  routeId: string,
  stopSlug: string,
  bodyKo: string,
  bodyEn: string,
  images: File[] = [],
  token = "",
  authorEmail = "",
  publishNow = false,
) {
  void token;
  const note = await addTourStopNoteWithImages(routeId, stopSlug, bodyKo, bodyEn, images, publishNow);
  return { item: storedTourNote(note, authorEmail) };
}

export async function loadTourRoutes() {
  const routes = await getTourRoutes();
  return {
    items: routes.map((route): StoredTourRoute => ({
      id: route.id,
      name: route.name,
      color: route.color,
      sort_index: route.sort_index,
      is_published: route.is_published,
      stops: route.tour_route_stops.map((stop) => ({
        id: stop.id,
        route_id: stop.route_id,
        stop_slug: stop.stop_slug,
        title_ko: stop.title_ko,
        title_en: stop.title_en,
        published: stop.is_published,
        sort_index: stop.sort_index,
      })),
    })),
  };
}

export async function createTourRoute(name: string, color: string, sortIndex: number) {
  const route = await insertTourRoute(name, color, sortIndex);
  return { item: { ...route, stops: [] } as StoredTourRoute };
}

export async function updateTourRoute(id: string, values: { name?: string; color?: string; is_published?: boolean }) {
  return { item: await patchTourRoute(id, values) };
}

export async function deleteTourRoute(id: string) {
  await removeTourRoute(id);
}

export async function createTourRouteStop(input: Omit<StoredTourRouteStop, "id">) {
  const stop = await insertTourRouteStop({
    route_id: input.route_id,
    stop_slug: input.stop_slug,
    title_ko: input.title_ko,
    title_en: input.title_en,
    is_published: input.published,
    sort_index: input.sort_index,
  });
  return { item: { ...input, id: stop.id } };
}

export async function updateTourRouteStop(id: string, input: Partial<Omit<StoredTourRouteStop, "id" | "route_id">>) {
  const stop = await patchTourRouteStop(id, {
    stop_slug: input.stop_slug,
    title_ko: input.title_ko,
    title_en: input.title_en,
    is_published: input.published,
    sort_index: input.sort_index,
  });
  return { item: stop };
}

export async function deleteTourRouteStop(id: string) {
  await removeTourRouteStop(id);
}

export async function loadArchiveEntries() {
  const collections = await getArchiveCollections();
  const items = collections.flatMap((collection) => collection.archive_entries.map((entry): StoredArchiveEntry => {
    const file = entry.archive_attachments[0];
    return {
      id: entry.id,
      collection_id: collection.id,
      year: entry.year,
      date: entry.entry_date,
      title_ko: entry.title_ko,
      title_en: entry.title_en,
      summary_ko: entry.summary_ko,
      summary_en: entry.summary_en,
      file_url: file?.signed_url || null,
      file_name: file?.original_name || null,
      file_type: file?.mime_type || null,
      file_size: file?.size_bytes || null,
      is_published: entry.is_published,
    };
  }));
  return { items, collections };
}

export async function createArchiveEntry(input: {
  collectionId: string;
  year: number;
  titleKo: string;
  titleEn: string;
  summaryKo: string;
  summaryEn: string;
  file?: File;
}) {
  const id = await insertArchiveEntry(input);
  const { items } = await loadArchiveEntries();
  const item = items.find((entry) => entry.id === id);
  if (!item) throw new Error("The archive entry was saved but could not be reloaded.");
  return { item };
}

export async function updateArchiveEntry(id: string, input: { year: number; titleKo: string; titleEn: string; summaryKo: string; summaryEn: string }) {
  await patchArchiveEntry(id, input);
}

export async function deleteArchiveEntry(id: string) {
  await removeArchiveEntry(id);
}
