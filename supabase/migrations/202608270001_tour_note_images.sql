-- SSHS Ambassadors — move member tour-note photos to Supabase.
-- Run after 202608190001_initial_schema.sql and
-- 202608190002_tour_stop_notes.sql.

-- Older development data used two obsolete slugs. Rename them when doing so
-- cannot collide with an already-correct row. The FK on tour_stop_notes uses
-- ON UPDATE CASCADE, so any existing notes follow the rename.
do $$
begin
  if exists (select 1 from public.tour_stops where slug = 'irum-library')
     and not exists (select 1 from public.tour_stops where slug = 'library') then
    update public.tour_stops set slug = 'library' where slug = 'irum-library';
  end if;

  if exists (select 1 from public.tour_stops where slug = 'music-room')
     and not exists (select 1 from public.tour_stops where slug = 'music') then
    update public.tour_stops set slug = 'music' where slug = 'music-room';
  end if;
end
$$;

-- Temporarily move every existing route order out of the 1..12 range. This
-- makes the upsert work both in a fresh project and after the old 11-stop seed.
with moved as (
  select id, row_number() over (order by id) as position
  from public.tour_stops
)
update public.tour_stops as stop
set route_order = 1000000 + moved.position
from moved
where stop.id = moved.id;

-- The current React app uses these exact 12 slugs. Keep this list aligned with
-- app/data.ts; do not run the obsolete supabase/seed.sql tour-stop block.
insert into public.tour_stops
  (slug, route_order, building_ko, building_en, floor_ko, floor_en,
   name_ko, name_en, kicker_ko, kicker_en, description_ko, description_en,
   route_note_ko, route_note_en, map_x, map_y, is_published)
values
  ('great-hall', 1, '예지관', 'Yeji-Gwan', '1층', '1F', '대회의실', 'Great Hall',
   '투어의 시작', 'The starting point',
   '학교홍보단과 방문객이 처음 인사를 나누는 곳입니다. 이곳에서 안내를 시작해 학교를 한 바퀴 둘러봅니다.',
   'This is where our ambassadors first meet visitors and begin the complete campus loop.',
   '예지관 1층 오른쪽 · 안내 및 출발', 'Right side of Yeji-Gwan 1F · Welcome and departure',
   700, 395, true),
  ('history-hall', 2, '예지관', 'Yeji-Gwan', '1층', '1F', '역사관', 'History Hall',
   '학교의 시간이 모이는 곳', 'Where the school story begins',
   '1989년 개교 이후 이어진 서울과학고의 발자취를 만나는 공간입니다. 전시 자료를 통해 학교의 성장과 학생들의 도전을 살펴봅니다.',
   'Explore the story of Seoul Science High School since its opening in 1989 through records of the school and its students.',
   '예지관 1층 · 대회의실에서 조금 왼쪽', 'Yeji-Gwan 1F · Just left of the Great Hall',
   610, 400, true),
  ('maker-wind', 3, '예지관', 'Yeji-Gwan', '1층', '1F', '풍동실·창작실', 'Wind Tunnel & Maker Space',
   '아이디어를 실험으로', 'From idea to experiment',
   '풍동 실험 장비와 디지털 제작 도구를 활용하는 공간입니다. 서로 다른 두 실을 하나의 정류장으로 묶어 소개합니다.',
   'A combined stop introducing wind-tunnel experiments and digital fabrication tools across two neighboring rooms.',
   '풍동 · 3D 프린터 · 레이저 커터', 'Wind tunnel · 3D printers · Laser cutter',
   490, 407, true),
  ('observatory', 4, '예지관', 'Yeji-Gwan', '옥상', 'Rooftop', '천문대', 'Observatory',
   '도시 위에서 우주를 관측하다', 'Observing beyond the city',
   '예지관 중앙 계단을 따라 옥상까지 올라갑니다. 대구경 굴절망원경과 관측 장비를 활용한 천문 관측 활동이 이루어집니다.',
   'The central staircase leads to the rooftop observatory, home to a large-aperture refracting telescope and observation systems.',
   '예지관 중앙 계단 이용', 'Via the central Yeji-Gwan staircase',
   500, 240, true),
  ('biology', 5, '예지관', 'Yeji-Gwan', '4층', '4F', '생물과', 'Biology',
   '생명 현상을 탐구하는 실험실', 'Exploring living systems',
   '생물 수업과 실험이 이루어지는 공간을 함께 소개합니다. 현미경 관찰부터 분자생물학 실험까지 다양한 탐구가 이어집니다.',
   'Biology classrooms and laboratories support inquiry ranging from microscopy to molecular biology experiments.',
   '중앙 계단에서 4층 복도로 이동', 'From the central staircase to the fourth-floor corridor',
   630, 305, true),
  ('physics', 6, '예지관', 'Yeji-Gwan', '3층', '3F', '물리과', 'Physics',
   '현상을 측정하고 모델링하다', 'Measure, model, understand',
   '물리 수업과 실험 공간을 하나의 정류장으로 소개합니다. 광학, 전자기학, 진동 등 다양한 실험 장비를 활용합니다.',
   'Physics classrooms and laboratories bring together experiments in optics, electromagnetism, vibration, and more.',
   '중앙 계단으로 3층 이동', 'Down the central staircase to 3F',
   560, 337, true),
  ('earth-science', 7, '예지관', 'Yeji-Gwan', '2층', '2F', '지구과학과', 'Earth Science',
   '지구와 대기를 읽는 실험실', 'Reading Earth and atmosphere',
   '암석 박편 관찰과 대기 측정 등 지구과학 수업·실험 공간을 함께 소개합니다.',
   'Earth Science classrooms and laboratories support work such as rock-section observation and atmospheric measurement.',
   '예지관 2층 ↔ 융합인재관 2층 가교', 'Second-floor bridge to Yung-hap',
   650, 367, true),
  ('library', 8, '융합인재관', 'Yung-hap In-jae Gwan', '2층', '2F', '이룸관(도서관)', 'Irum Library',
   '읽기와 자습이 이어지는 중심', 'A hub for reading and study',
   '예지관 2층과 가교로 연결된 도서관입니다. 자료 탐색, 독서, 자습이 자연스럽게 이어지는 공간입니다.',
   'Connected to Yeji-Gwan by a second-floor bridge, the library supports research, reading, and independent study.',
   '예지관 2층 ↔ 융합인재관 2층 가교', '2F-to-2F bridge from Yeji-Gwan',
   855, 344, true),
  ('music', 9, '융합인재관', 'Yung-hap In-jae Gwan', '1층', '1F', '음악실', 'Music Room',
   '과학자의 감각을 넓히는 소리', 'Sound beyond science',
   '도서관에서 융합인재관 내부 계단으로 내려오면 만나는 음악 공간입니다.',
   'Reach the Music Room by taking the internal staircase down from the library on the second floor.',
   '융합인재관 내부 계단 이용', 'Via the internal Yung-hap staircase',
   870, 382, true),
  ('chemistry', 10, '창의인재관', 'Chang-ui In-jae Gwan', '2층', '2F', '화학과', 'Chemistry',
   '물질의 변화를 정밀하게 관찰하다', 'Observing change with precision',
   '융합인재관 밖의 연결 통로를 지나 창의인재관 계단참으로 이동합니다. 화학 수업과 실험 공간을 함께 소개합니다.',
   'An outdoor connecting walkway leads to the Chang-ui stair landing and the Chemistry classrooms and laboratories.',
   '실외 연결 통로 · 창의인재관 계단', 'Outdoor walkway · Chang-ui staircase',
   970, 455, true),
  ('computer-science', 11, '창의인재관', 'Chang-ui In-jae Gwan', '1층', '1F', '정보과', 'Computer Science',
   '논리와 코드로 문제를 해결하다', 'Solving problems through code',
   '창의인재관의 정보 수업과 실습 공간을 하나의 정류장으로 소개합니다. 이곳을 본 뒤 아래쪽 계단과 통로를 따라 예지관으로 돌아갑니다.',
   'Computer Science classrooms and practical spaces form the final stop before the lower stairway returns us to Yeji-Gwan.',
   '창의인재관 1층 · 계단 아래', 'Chang-ui 1F · Below the staircase',
   970, 495, true),
  ('return-great-hall', 12, '예지관', 'Yeji-Gwan', '1층', '1F', '대회의실', 'Great Hall',
   '다시 출발점으로', 'Back where we began',
   '정보과에서 아래쪽 계단과 연결 통로를 따라 예지관으로 돌아옵니다. 대회의실에서 마지막 인사를 나누며 투어를 마칩니다.',
   'From Computer Science, the lower stairs and connecting path lead back to Yeji-Gwan. The tour closes with a final farewell in the Great Hall.',
   '예지관 1층 오른쪽 · 투어 마무리', 'Right side of Yeji-Gwan 1F · Tour closing',
   700, 395, true)
on conflict (slug) do update set
  route_order = excluded.route_order,
  building_ko = excluded.building_ko,
  building_en = excluded.building_en,
  floor_ko = excluded.floor_ko,
  floor_en = excluded.floor_en,
  name_ko = excluded.name_ko,
  name_en = excluded.name_en,
  kicker_ko = excluded.kicker_ko,
  kicker_en = excluded.kicker_en,
  description_ko = excluded.description_ko,
  description_en = excluded.description_en,
  route_note_ko = excluded.route_note_ko,
  route_note_en = excluded.route_note_en,
  map_x = excluded.map_x,
  map_y = excluded.map_y,
  is_published = excluded.is_published;

create table if not exists public.tour_stop_note_images (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.tour_stop_notes(id) on delete cascade,
  storage_path text not null unique,
  original_name text not null,
  sort_order integer not null check (sort_order between 0 and 9),
  created_at timestamptz not null default now()
);

create index if not exists tour_stop_note_images_note_order_idx
on public.tour_stop_note_images(note_id, sort_order);

alter table public.tour_stop_note_images enable row level security;

grant select on public.tour_stop_note_images to anon, authenticated;
grant insert, update, delete on public.tour_stop_note_images to authenticated;

drop policy if exists "public read published tour note images" on public.tour_stop_note_images;
create policy "public read published tour note images"
on public.tour_stop_note_images for select to anon
using (
  exists (
    select 1 from public.tour_stop_notes as note
    where note.id = note_id and note.is_published
  )
);

drop policy if exists "members read tour note images" on public.tour_stop_note_images;
create policy "members read tour note images"
on public.tour_stop_note_images for select to authenticated
using (public.current_app_role() in ('member', 'admin'));

drop policy if exists "members add own tour note images" on public.tour_stop_note_images;
create policy "members add own tour note images"
on public.tour_stop_note_images for insert to authenticated
with check (
  exists (
    select 1 from public.tour_stop_notes as note
    where note.id = note_id
      and note.author_id = auth.uid()
  )
);

drop policy if exists "members update own draft tour note images" on public.tour_stop_note_images;
create policy "members update own draft tour note images"
on public.tour_stop_note_images for update to authenticated
using (
  exists (
    select 1 from public.tour_stop_notes as note
    where note.id = note_id
      and note.author_id = auth.uid()
      and not note.is_published
  )
)
with check (
  exists (
    select 1 from public.tour_stop_notes as note
    where note.id = note_id
      and note.author_id = auth.uid()
      and not note.is_published
  )
);

drop policy if exists "members delete own draft tour note images" on public.tour_stop_note_images;
create policy "members delete own draft tour note images"
on public.tour_stop_note_images for delete to authenticated
using (
  exists (
    select 1 from public.tour_stop_notes as note
    where note.id = note_id
      and note.author_id = auth.uid()
      and not note.is_published
  )
);

drop policy if exists "admin manage tour note images" on public.tour_stop_note_images;
create policy "admin manage tour note images"
on public.tour_stop_note_images for all to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'tour-images', 'tour-images', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Public display remains enabled for published tour images. Upload/update/delete
-- policies below only grant access inside tour-notes/<note-id>/... and verify
-- that the current user owns the associated note. Existing admin-wide policies
-- from the initial migration continue to apply as an additional permission.
drop policy if exists "public read tour images" on storage.objects;
create policy "public read tour images"
on storage.objects for select to anon, authenticated
using (bucket_id = 'tour-images');

drop policy if exists "members upload own tour note images" on storage.objects;
create policy "members upload own tour note images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'tour-images'
  and (storage.foldername(name))[1] = 'tour-notes'
  and exists (
    select 1 from public.tour_stop_notes as note
    where note.id::text = (storage.foldername(name))[2]
      and note.author_id = auth.uid()
  )
);

drop policy if exists "members update own tour note image files" on storage.objects;
create policy "members update own tour note image files"
on storage.objects for update to authenticated
using (
  bucket_id = 'tour-images'
  and (storage.foldername(name))[1] = 'tour-notes'
  and exists (
    select 1 from public.tour_stop_notes as note
    where note.id::text = (storage.foldername(name))[2]
      and note.author_id = auth.uid()
      and not note.is_published
  )
)
with check (
  bucket_id = 'tour-images'
  and (storage.foldername(name))[1] = 'tour-notes'
  and exists (
    select 1 from public.tour_stop_notes as note
    where note.id::text = (storage.foldername(name))[2]
      and note.author_id = auth.uid()
      and not note.is_published
  )
);

drop policy if exists "members delete own tour note image files" on storage.objects;
create policy "members delete own tour note image files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'tour-images'
  and (storage.foldername(name))[1] = 'tour-notes'
  and exists (
    select 1 from public.tour_stop_notes as note
    where note.id::text = (storage.foldername(name))[2]
      and note.author_id = auth.uid()
      and not note.is_published
  )
);
