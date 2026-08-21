-- SSHS Ambassadors — initial schema
-- Run once in a NEW Supabase project. Do not run against the legacy project.

create extension if not exists pgcrypto;

create type public.app_role as enum ('member', 'admin');
create type public.publish_status as enum ('draft', 'published', 'closed');
create type public.question_type as enum ('short', 'long', 'single', 'multiple', 'scale', 'yesno');
create type public.archive_block_type as enum ('heading', 'paragraph', 'callout', 'image', 'gallery', 'attachment', 'link', 'divider');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role public.app_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tour_stops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  route_order integer not null unique check (route_order > 0),
  building_ko text not null,
  building_en text not null,
  floor_ko text not null,
  floor_en text not null,
  name_ko text not null,
  name_en text not null,
  kicker_ko text not null default '',
  kicker_en text not null default '',
  description_ko text not null default '',
  description_en text not null default '',
  route_note_ko text not null default '',
  route_note_en text not null default '',
  map_x numeric(7,2) not null,
  map_y numeric(7,2) not null,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tour_photos (
  id uuid primary key default gen_random_uuid(),
  stop_id uuid not null references public.tour_stops(id) on delete cascade,
  storage_path text not null unique,
  alt_ko text not null,
  alt_en text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.archive_collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title_ko text not null,
  title_en text not null,
  summary_ko text not null default '',
  summary_en text not null default '',
  cover_path text,
  accent_color text not null default '#005CE6' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.archive_entries (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.archive_collections(id) on delete cascade,
  entry_date date not null,
  title_ko text not null,
  title_en text not null,
  subtitle_ko text not null default '',
  subtitle_en text not null default '',
  year integer generated always as (extract(year from entry_date)::integer) stored,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.archive_blocks (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.archive_entries(id) on delete cascade,
  block_type public.archive_block_type not null,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.archive_attachments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.archive_entries(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete restrict,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  created_at timestamptz not null default now()
);

create table public.surveys (
  id uuid primary key default gen_random_uuid(),
  survey_number integer not null unique check (survey_number > 0),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title_ko text not null,
  title_en text not null,
  description_ko text not null default '',
  description_en text not null default '',
  status public.publish_status not null default 'draft',
  opens_at timestamptz,
  closes_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (closes_at is null or opens_at is null or closes_at > opens_at)
);

create table public.survey_questions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  question_key text not null check (question_key ~ '^[a-z][a-z0-9_-]*$'),
  label_ko text not null,
  label_en text not null,
  question_type public.question_type not null,
  is_required boolean not null default false,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  condition_question_key text,
  condition_equals text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (survey_id, question_key),
  check ((condition_question_key is null and condition_equals is null) or (condition_question_key is not null and condition_equals is not null))
);

create table public.survey_responses (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.surveys(id) on delete cascade,
  anonymous_code text not null unique default ('R-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10))),
  submitted_at timestamptz not null default now(),
  user_agent_hint text,
  schema_version integer not null default 1 check (schema_version > 0)
);

create table public.survey_answers (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public.survey_responses(id) on delete cascade,
  question_id uuid not null references public.survey_questions(id) on delete cascade,
  value jsonb not null,
  created_at timestamptz not null default now(),
  unique (response_id, question_id)
);

create index tour_stops_published_order_idx on public.tour_stops(is_published, route_order);
create index archive_collections_order_idx on public.archive_collections(is_published, sort_order);
create index archive_entries_collection_year_idx on public.archive_entries(collection_id, year desc, entry_date desc);
create index archive_blocks_entry_order_idx on public.archive_blocks(entry_id, sort_order);
create index archive_attachments_entry_idx on public.archive_attachments(entry_id, created_at desc);
create index surveys_status_number_idx on public.surveys(status, survey_number desc);
create index survey_questions_survey_order_idx on public.survey_questions(survey_id, sort_order);
create index survey_responses_survey_date_idx on public.survey_responses(survey_id, submitted_at desc);
create index survey_answers_response_idx on public.survey_answers(response_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger tour_stops_updated_at before update on public.tour_stops for each row execute function public.set_updated_at();
create trigger archive_collections_updated_at before update on public.archive_collections for each row execute function public.set_updated_at();
create trigger archive_entries_updated_at before update on public.archive_entries for each row execute function public.set_updated_at();
create trigger archive_blocks_updated_at before update on public.archive_blocks for each row execute function public.set_updated_at();
create trigger surveys_updated_at before update on public.surveys for each row execute function public.set_updated_at();
create trigger survey_questions_updated_at before update on public.survey_questions for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles(id, email, display_name, role)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'display_name', ''), 'member')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.current_app_role() to anon, authenticated;

create or replace function public.store_survey_response(p_survey_id uuid, p_answers jsonb, p_user_agent_hint text default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  response_id uuid;
begin
  insert into public.survey_responses(survey_id, user_agent_hint)
  values (p_survey_id, left(p_user_agent_hint, 120))
  returning id into response_id;

  insert into public.survey_answers(response_id, question_id, value)
  select response_id, q.id, answer.value
  from jsonb_each(p_answers) as answer(key, value)
  join public.survey_questions q
    on q.survey_id = p_survey_id and q.question_key = answer.key;

  return response_id;
end;
$$;

revoke all on function public.store_survey_response(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function public.store_survey_response(uuid, jsonb, text) to service_role;

alter table public.profiles enable row level security;
alter table public.tour_stops enable row level security;
alter table public.tour_photos enable row level security;
alter table public.archive_collections enable row level security;
alter table public.archive_entries enable row level security;
alter table public.archive_blocks enable row level security;
alter table public.archive_attachments enable row level security;
alter table public.surveys enable row level security;
alter table public.survey_questions enable row level security;
alter table public.survey_responses enable row level security;
alter table public.survey_answers enable row level security;

create policy "profile own read" on public.profiles for select to authenticated using (id = auth.uid() or public.current_app_role() = 'admin');
create policy "profile admin update" on public.profiles for update to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "public read published tour" on public.tour_stops for select to anon, authenticated using (is_published or public.current_app_role() = 'admin');
create policy "admin manage tour" on public.tour_stops for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "public read tour photos" on public.tour_photos for select to anon, authenticated using (exists (select 1 from public.tour_stops s where s.id = stop_id and s.is_published) or public.current_app_role() = 'admin');
create policy "admin manage tour photos" on public.tour_photos for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');

create policy "members read archive collections" on public.archive_collections for select to authenticated using (public.current_app_role() in ('member','admin') and (is_published or public.current_app_role() = 'admin'));
create policy "admin manage archive collections" on public.archive_collections for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "members read archive entries" on public.archive_entries for select to authenticated using (public.current_app_role() in ('member','admin') and (is_published or public.current_app_role() = 'admin'));
create policy "admin manage archive entries" on public.archive_entries for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "members read archive blocks" on public.archive_blocks for select to authenticated using (public.current_app_role() in ('member','admin') and exists (select 1 from public.archive_entries e where e.id = entry_id and (e.is_published or public.current_app_role() = 'admin')));
create policy "admin manage archive blocks" on public.archive_blocks for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "members read archive attachments" on public.archive_attachments for select to authenticated using (public.current_app_role() in ('member','admin'));
create policy "members add archive attachments" on public.archive_attachments for insert to authenticated with check (public.current_app_role() in ('member','admin') and uploader_id = auth.uid());
create policy "admin manage archive attachments" on public.archive_attachments for update to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "admin delete archive attachments" on public.archive_attachments for delete to authenticated using (public.current_app_role() = 'admin');

create policy "public read published surveys" on public.surveys for select to anon, authenticated using (status in ('published','closed') or public.current_app_role() = 'admin');
create policy "admin manage surveys" on public.surveys for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "public read published questions" on public.survey_questions for select to anon, authenticated using (exists (select 1 from public.surveys s where s.id = survey_id and s.status in ('published','closed')) or public.current_app_role() = 'admin');
create policy "admin manage survey questions" on public.survey_questions for all to authenticated using (public.current_app_role() = 'admin') with check (public.current_app_role() = 'admin');
create policy "members read survey responses" on public.survey_responses for select to authenticated using (public.current_app_role() in ('member','admin'));
create policy "admin delete survey responses" on public.survey_responses for delete to authenticated using (public.current_app_role() = 'admin');
create policy "members read survey answers" on public.survey_answers for select to authenticated using (public.current_app_role() in ('member','admin'));
create policy "admin delete survey answers" on public.survey_answers for delete to authenticated using (public.current_app_role() = 'admin');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('tour-images', 'tour-images', true, 10485760, array['image/jpeg','image/png','image/webp']),
  ('archive-files', 'archive-files', false, 26214400, array['application/pdf','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public read tour images" on storage.objects for select to anon, authenticated using (bucket_id = 'tour-images');
create policy "admin upload tour images" on storage.objects for insert to authenticated with check (bucket_id = 'tour-images' and public.current_app_role() = 'admin');
create policy "admin update tour images" on storage.objects for update to authenticated using (bucket_id = 'tour-images' and public.current_app_role() = 'admin') with check (bucket_id = 'tour-images' and public.current_app_role() = 'admin');
create policy "admin delete tour images" on storage.objects for delete to authenticated using (bucket_id = 'tour-images' and public.current_app_role() = 'admin');

create policy "members read archive files" on storage.objects for select to authenticated using (bucket_id = 'archive-files' and public.current_app_role() in ('member','admin'));
create policy "members upload archive files" on storage.objects for insert to authenticated with check (bucket_id = 'archive-files' and public.current_app_role() in ('member','admin'));
create policy "admin update archive files" on storage.objects for update to authenticated using (bucket_id = 'archive-files' and public.current_app_role() = 'admin') with check (bucket_id = 'archive-files' and public.current_app_role() = 'admin');
create policy "admin delete archive files" on storage.objects for delete to authenticated using (bucket_id = 'archive-files' and public.current_app_role() = 'admin');

revoke insert, update on public.survey_responses from anon, authenticated;
revoke insert, update on public.survey_answers from anon, authenticated;
