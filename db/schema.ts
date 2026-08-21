import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const tourRoutes = sqliteTable("tour_routes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  sortIndex: integer("sort_index").notNull(),
  createdAt: text("created_at").notNull(),
});

export const tourNotes = sqliteTable("tour_notes", {
  id: text("id").primaryKey(),
  routeId: text("route_id").notNull(),
  stopSlug: text("stop_slug").notNull(),
  bodyKo: text("body_ko").notNull(),
  bodyEn: text("body_en").notNull(),
  imageKey: text("image_key"),
  imageName: text("image_name"),
  authorEmail: text("author_email").notNull(),
  createdAt: text("created_at").notNull(),
});

export const tourNoteImages = sqliteTable("tour_note_images", {
  id: text("id").primaryKey(),
  noteId: text("note_id").notNull(),
  imageKey: text("image_key").notNull(),
  imageName: text("image_name").notNull(),
  sortIndex: integer("sort_index").notNull(),
  createdAt: text("created_at").notNull(),
}, (table) => [index("tour_note_images_note_idx").on(table.noteId, table.sortIndex)]);

export const archiveEntries = sqliteTable("archive_entries", {
  id: text("id").primaryKey(),
  year: integer("year").notNull(),
  date: text("date").notNull(),
  titleKo: text("title_ko").notNull(),
  titleEn: text("title_en").notNull(),
  summaryKo: text("summary_ko").notNull(),
  summaryEn: text("summary_en").notNull(),
  fileKey: text("file_key"),
  fileName: text("file_name"),
  fileType: text("file_type"),
  fileSize: integer("file_size"),
  authorEmail: text("author_email").notNull(),
  createdAt: text("created_at").notNull(),
});
