-- SSHS Ambassadors — member-contributed tour descriptions
-- Run after 202608190001_initial_schema.sql.

create table public.tour_stop_notes (
  id uuid primary key default gen_random_uuid(),
  tour_stop_slug text not null references public.tour_stops(slug) on update cascade on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body_ko text not null check (char_length(body_ko) between 1 and 2000),
  body_en text not null default '' check (char_length(body_en) <= 2000),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tour_stop_notes_stop_date_idx on public.tour_stop_notes(tour_stop_slug, created_at desc);
create index tour_stop_notes_author_idx on public.tour_stop_notes(author_id, created_at desc);

create trigger tour_stop_notes_updated_at
before update on public.tour_stop_notes
for each row execute function public.set_updated_at();

alter table public.tour_stop_notes enable row level security;

create policy "public read published tour notes"
on public.tour_stop_notes for select to anon
using (is_published);

create policy "members read tour notes"
on public.tour_stop_notes for select to authenticated
using (public.current_app_role() in ('member', 'admin'));

create policy "members add draft tour notes"
on public.tour_stop_notes for insert to authenticated
with check (
  public.current_app_role() in ('member', 'admin')
  and author_id = auth.uid()
  and is_published = false
);

create policy "members update own draft tour notes"
on public.tour_stop_notes for update to authenticated
using (author_id = auth.uid() and is_published = false)
with check (author_id = auth.uid() and is_published = false);

create policy "members delete own draft tour notes"
on public.tour_stop_notes for delete to authenticated
using (author_id = auth.uid() and is_published = false);

create policy "admin manage tour notes"
on public.tour_stop_notes for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');
