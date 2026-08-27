-- SSHS Ambassadors — complete the GitHub Pages/Supabase integration.
-- Run once after 202608270001_tour_note_images.sql. This migration is
-- intentionally idempotent so it can also repair a partially seeded project.

create table if not exists public.tour_routes (
  id text primary key check (id ~ '^tour-[a-z0-9-]+$'),
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#FF2D8D' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_index integer not null default 1 check (sort_index > 0),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.tour_routes(id, name, color, sort_index, is_published)
values ('tour-1', 'Tour 1', '#FF2D8D', 1, true)
on conflict (id) do update set
  name = excluded.name,
  sort_index = excluded.sort_index;

create table if not exists public.tour_route_stops (
  id uuid primary key default gen_random_uuid(),
  route_id text not null references public.tour_routes(id) on update cascade on delete cascade,
  stop_slug text not null references public.tour_stops(slug) on update cascade on delete restrict,
  title_ko text not null,
  title_en text not null,
  is_published boolean not null default false,
  sort_index integer not null check (sort_index > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (route_id, stop_slug),
  unique (route_id, sort_index)
);

insert into public.tour_route_stops(route_id, stop_slug, title_ko, title_en, is_published, sort_index)
select 'tour-1', slug, name_ko, name_en, true, route_order
from public.tour_stops
where slug in (
  'great-hall', 'history-hall', 'maker-wind', 'observatory', 'biology',
  'physics', 'earth-science', 'library', 'music', 'chemistry',
  'computer-science', 'return-great-hall'
)
on conflict (route_id, stop_slug) do update set
  title_ko = excluded.title_ko,
  title_en = excluded.title_en,
  is_published = true,
  sort_index = excluded.sort_index;

alter table public.tour_stop_notes
  add column if not exists route_id text not null default 'tour-1';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'tour_stop_notes_route_id_fkey'
      and conrelid = 'public.tour_stop_notes'::regclass
  ) then
    alter table public.tour_stop_notes
      add constraint tour_stop_notes_route_id_fkey
      foreign key (route_id) references public.tour_routes(id)
      on update cascade on delete cascade;
  end if;
end
$$;

create index if not exists tour_routes_order_idx
on public.tour_routes(is_published, sort_index);

create index if not exists tour_route_stops_order_idx
on public.tour_route_stops(route_id, is_published, sort_index);

create index if not exists tour_stop_notes_route_stop_date_idx
on public.tour_stop_notes(route_id, tour_stop_slug, created_at desc);

drop trigger if exists tour_routes_updated_at on public.tour_routes;
create trigger tour_routes_updated_at
before update on public.tour_routes
for each row execute function public.set_updated_at();

drop trigger if exists tour_route_stops_updated_at on public.tour_route_stops;
create trigger tour_route_stops_updated_at
before update on public.tour_route_stops
for each row execute function public.set_updated_at();

alter table public.tour_routes enable row level security;
alter table public.tour_route_stops enable row level security;

grant select on public.tour_routes, public.tour_route_stops to anon, authenticated;
grant insert, update, delete on public.tour_routes, public.tour_route_stops to authenticated;
grant select on public.tour_stop_notes, public.tour_stop_note_images to anon, authenticated;
grant insert, update, delete on public.tour_stop_notes, public.tour_stop_note_images to authenticated;

drop policy if exists "public read published tour routes" on public.tour_routes;
create policy "public read published tour routes"
on public.tour_routes for select to anon, authenticated
using (is_published or public.current_app_role() = 'admin');

drop policy if exists "admin manage tour routes" on public.tour_routes;
create policy "admin manage tour routes"
on public.tour_routes for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists "public read published route stops" on public.tour_route_stops;
create policy "public read published route stops"
on public.tour_route_stops for select to anon, authenticated
using (
  (is_published and exists (
    select 1 from public.tour_routes as route
    where route.id = route_id and route.is_published
  ))
  or public.current_app_role() = 'admin'
);

drop policy if exists "admin manage route stops" on public.tour_route_stops;
create policy "admin manage route stops"
on public.tour_route_stops for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

-- The Archive page must have real collections. Content entries remain empty
-- until an administrator adds approved material.
insert into public.archive_collections
  (id, slug, title_ko, title_en, summary_ko, summary_en, accent_color, sort_order, is_published)
values
  ('20000000-0000-4000-8000-000000000001', 'tour-operations', '투어 운영 기록', 'Tour Operations', '방문 일정, 동선 검토, 운영 회고를 연도별로 정리합니다.', 'Visit schedules, route reviews, and operational retrospectives by year.', '#005CE6', 1, true),
  ('20000000-0000-4000-8000-000000000002', 'ambassador-training', '홍보단 교육 자료', 'Ambassador Training', '설명 연습, 응대 원칙, 장소별 핵심 내용을 공유합니다.', 'Speaking practice, visitor guidelines, and key points for each stop.', '#FF2D8D', 2, true),
  ('20000000-0000-4000-8000-000000000003', 'public-media-kit', '공개 홍보 자료', 'Public Media Kit', '승인된 소개문, 로고, 공개용 이미지 자료를 모읍니다.', 'Approved descriptions, logos, and public-use image resources.', '#0A9C78', 3, true)
on conflict (id) do update set
  slug = excluded.slug,
  title_ko = excluded.title_ko,
  title_en = excluded.title_en,
  summary_ko = excluded.summary_ko,
  summary_en = excluded.summary_en,
  accent_color = excluded.accent_color,
  sort_order = excluded.sort_order,
  is_published = excluded.is_published;

-- Use UUID survey IDs because the public Edge Function validates and stores
-- UUIDs. These rows replace the old front-end-only string IDs.
insert into public.surveys
  (id, survey_number, slug, title_ko, title_en, description_ko, description_en, status, opens_at, closes_at)
values
  ('30000000-0000-4000-8000-000000000001', 1, 'campus-visitor-tour', '학교 방문 투어', 'Campus Visitor Tour', '오늘의 투어 경험을 알려주세요. 응답은 익명으로 저장됩니다.', 'Tell us about today''s tour. Your response is anonymous.', 'published', '2026-08-18T00:00:00Z', null),
  ('30000000-0000-4000-8000-000000000002', 2, 'international-exchange-tour', '국제 교류단 투어', 'International Exchange Tour', '영문 투어의 설명과 동선에 대한 의견을 받습니다.', 'Share feedback on the English-language route and presentation.', 'published', '2026-07-24T00:00:00Z', null),
  ('30000000-0000-4000-8000-000000000003', 3, 'science-fair-open-tour', '과학전람회 공개 투어', 'Science Fair Open Tour', '응답 기간이 종료된 설문입니다.', 'This survey is now closed.', 'closed', '2026-06-12T00:00:00Z', '2026-06-13T00:00:00Z')
on conflict (id) do update set
  title_ko = excluded.title_ko,
  title_en = excluded.title_en,
  description_ko = excluded.description_ko,
  description_en = excluded.description_en,
  status = excluded.status,
  opens_at = excluded.opens_at,
  closes_at = excluded.closes_at;

insert into public.survey_questions
  (id, survey_id, question_key, label_ko, label_en, question_type, is_required, options, condition_question_key, condition_equals, sort_order)
values
  ('31000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', 'satisfaction', '투어에 얼마나 만족하셨나요?', 'How satisfied were you with the tour?', 'scale', true, '[]', null, null, 1),
  ('31000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000001', 'language', '투어에서 사용한 언어', 'Language used during the tour', 'single', true, '["한국어","English"]', null, null, 2),
  ('31000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'english', '학생들의 영어 설명은 어땠나요?', 'How would you rate the students'' English presentation?', 'scale', true, '[]', 'language', 'English', 3),
  ('31000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000001', 'knowledge', '학생들의 투어 내용 숙지도', 'How well did the students know the tour content?', 'scale', true, '[]', null, null, 4),
  ('31000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000001', 'comment', '그 밖에 전하고 싶은 의견', 'Anything else you would like to share?', 'long', false, '[]', null, null, 5),
  ('31100000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000002', 'satisfaction', '투어에 얼마나 만족하셨나요?', 'How satisfied were you with the tour?', 'scale', true, '[]', null, null, 1),
  ('31100000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', 'language', '투어에서 사용한 언어', 'Language used during the tour', 'single', true, '["한국어","English"]', null, null, 2),
  ('31100000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000002', 'english', '학생들의 영어 설명은 어땠나요?', 'How would you rate the students'' English presentation?', 'scale', true, '[]', 'language', 'English', 3),
  ('31100000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000002', 'knowledge', '학생들의 투어 내용 숙지도', 'How well did the students know the tour content?', 'scale', true, '[]', null, null, 4),
  ('31100000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000002', 'comment', '그 밖에 전하고 싶은 의견', 'Anything else you would like to share?', 'long', false, '[]', null, null, 5),
  ('31200000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000003', 'satisfaction', '투어에 얼마나 만족하셨나요?', 'How satisfied were you with the tour?', 'scale', true, '[]', null, null, 1),
  ('31200000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000003', 'language', '투어에서 사용한 언어', 'Language used during the tour', 'single', true, '["한국어","English"]', null, null, 2),
  ('31200000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', 'english', '학생들의 영어 설명은 어땠나요?', 'How would you rate the students'' English presentation?', 'scale', true, '[]', 'language', 'English', 3),
  ('31200000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000003', 'knowledge', '학생들의 투어 내용 숙지도', 'How well did the students know the tour content?', 'scale', true, '[]', null, null, 4),
  ('31200000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000003', 'comment', '그 밖에 전하고 싶은 의견', 'Anything else you would like to share?', 'long', false, '[]', null, null, 5)
on conflict (id) do update set
  label_ko = excluded.label_ko,
  label_en = excluded.label_en,
  question_type = excluded.question_type,
  is_required = excluded.is_required,
  options = excluded.options,
  condition_question_key = excluded.condition_question_key,
  condition_equals = excluded.condition_equals,
  sort_order = excluded.sort_order;

grant select on public.archive_collections, public.archive_entries, public.archive_blocks, public.archive_attachments to authenticated;
grant insert, update, delete on public.archive_collections, public.archive_entries, public.archive_blocks, public.archive_attachments to authenticated;
grant select on public.surveys, public.survey_questions to anon, authenticated;
grant insert, update, delete on public.surveys, public.survey_questions to authenticated;
grant select on public.survey_responses, public.survey_answers to authenticated;
