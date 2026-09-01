-- Make ambassador notes public by default, allow signed-in members to remove
-- a note together with its image records/files, and remove the retired survey.

update public.tour_stop_notes
set is_published = true
where not is_published;

alter table public.tour_stop_notes
  alter column is_published set default true;

drop policy if exists "members add draft tour notes" on public.tour_stop_notes;
drop policy if exists "members add public tour notes" on public.tour_stop_notes;
create policy "members add public tour notes"
on public.tour_stop_notes for insert to authenticated
with check (
  public.current_app_role() in ('member', 'admin')
  and author_id = auth.uid()
  and is_published
);

drop policy if exists "members delete own draft tour notes" on public.tour_stop_notes;
drop policy if exists "members delete tour notes" on public.tour_stop_notes;
create policy "members delete tour notes"
on public.tour_stop_notes for delete to authenticated
using (public.current_app_role() in ('member', 'admin'));

drop policy if exists "members delete own draft tour note images" on public.tour_stop_note_images;
drop policy if exists "members delete tour note images" on public.tour_stop_note_images;
create policy "members delete tour note images"
on public.tour_stop_note_images for delete to authenticated
using (public.current_app_role() in ('member', 'admin'));

drop policy if exists "members delete own tour note image files" on storage.objects;
drop policy if exists "members delete tour note image files" on storage.objects;
create policy "members delete tour note image files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'tour-images'
  and public.current_app_role() in ('member', 'admin')
);

delete from public.surveys
where id = '30000000-0000-4000-8000-000000000003'
   or slug = 'science-fair-open-tour';
