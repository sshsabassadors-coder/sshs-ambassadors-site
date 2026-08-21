-- Fictional, non-personal seed data for development only.

insert into public.tour_stops
  (id, slug, route_order, building_ko, building_en, floor_ko, floor_en, name_ko, name_en, kicker_ko, kicker_en, description_ko, description_en, route_note_ko, route_note_en, map_x, map_y, is_published)
values
  ('10000000-0000-4000-8000-000000000001','great-hall',1,'예지관','Yeji-Gwan','1층','1F','대회의실','Great Hall','투어의 시작과 끝','The start and finish','투어가 출발해 다시 돌아오는 순환 경로의 기준점입니다.','The reference point where the loop tour begins and ends.','예지관 1층 오른쪽','Right side of Yeji-Gwan 1F',676,329,true),
  ('10000000-0000-4000-8000-000000000002','history-hall',2,'예지관','Yeji-Gwan','1층','1F','역사관','History Hall','학교의 시간이 모이는 곳','Where the school story begins','학교의 발자취를 만나는 공간입니다.','A space introducing the school history.', '정문 기준 예지관 왼쪽','Left side of Yeji-Gwan from the main entrance',449,337,true),
  ('10000000-0000-4000-8000-000000000003','maker-wind',3,'예지관','Yeji-Gwan','1층','1F','풍동실·창작실','Wind Tunnel & Maker Space','아이디어를 실험으로','From idea to experiment','풍동과 디지털 제작 공간을 함께 소개합니다.','A combined stop for wind-tunnel and digital fabrication work.','중앙 계단으로 이동','Continue to the central staircase',570,328,true),
  ('10000000-0000-4000-8000-000000000004','observatory',4,'예지관','Yeji-Gwan','옥상','Rooftop','천문대','Observatory','도시 위에서 우주를 관측하다','Observing beyond the city','천문 관측 활동이 이루어지는 공간입니다.','A space for astronomical observation.','예지관 중앙 계단','Central Yeji-Gwan staircase',503,151,true),
  ('10000000-0000-4000-8000-000000000005','biology',5,'예지관','Yeji-Gwan','4층','4F','생물과','Biology','생명 현상을 탐구하는 실험실','Exploring living systems','생물 수업과 실험 공간입니다.','Biology classrooms and laboratories.', '중앙 계단에서 4층 복도로 이동','From the central staircase to the fourth-floor corridor',533,245,true),
  ('10000000-0000-4000-8000-000000000008','physics',6,'예지관','Yeji-Gwan','3층','3F','물리과','Physics','현상을 측정하고 모델링하다','Measure, model, understand','물리 수업과 실험 공간입니다.','Physics classrooms and laboratories.','중앙 계단으로 3층 이동','Down the central staircase to 3F',590,259,true),
  ('10000000-0000-4000-8000-000000000010','earth-science',7,'예지관','Yeji-Gwan','2층','2F','지구과학과','Earth Science','지구와 대기를 읽는 실험실','Reading Earth and atmosphere','지구과학 수업과 실험 공간입니다.','Earth Science classrooms and laboratories.','예지관 2층 가교','Second-floor bridge',651,275,true),
  ('10000000-0000-4000-8000-000000000011','irum-library',8,'융합인재관','Yung-hap In-jae Gwan','2층','2F','이룸관(도서관)','Irum Library','읽기와 자습이 이어지는 중심','A hub for reading and study','독서와 자습을 위한 도서관입니다.','A library for reading and independent study.','2층 가교로 도착','Arrive via the 2F-to-2F bridge',833,269,true),
  ('10000000-0000-4000-8000-000000000012','music-room',9,'융합인재관','Yung-hap In-jae Gwan','1층','1F','음악실','Music Room','과학자의 감각을 넓히는 소리','Sound beyond science','음악 수업을 위한 공간입니다.','A space for music classes.','융합인재관 내부 계단','Internal Yung-hap staircase',871,310,true),
  ('10000000-0000-4000-8000-000000000013','chemistry',10,'창의인재관','Chang-ui In-jae Gwan','2층','2F','화학과','Chemistry','물질의 변화를 정밀하게 관찰하다','Observing change with precision','화학 수업과 실험 공간입니다.','Chemistry classrooms and laboratories.','창의인재관 계단','Chang-ui staircase',900,407,true),
  ('10000000-0000-4000-8000-000000000014','computer-science',11,'창의인재관','Chang-ui In-jae Gwan','1층','1F','정보과','Computer Science','논리와 코드로 문제를 해결하다','Solving problems through code','정보 수업과 실습 공간입니다.','Computer Science classrooms and practical spaces.','창의인재관 1층','Chang-ui 1F',905,478,true)
on conflict (id) do nothing;

insert into public.archive_collections
  (id, slug, title_ko, title_en, summary_ko, summary_en, accent_color, sort_order, is_published)
values
  ('20000000-0000-4000-8000-000000000001','tour-operations','투어 운영 기록','Tour Operations','방문 일정, 동선 검토, 운영 회고를 연도별로 정리합니다.','Visit schedules, route reviews, and operational retrospectives by year.','#005CE6',1,true),
  ('20000000-0000-4000-8000-000000000002','ambassador-training','홍보단 교육 자료','Ambassador Training','설명 연습, 응대 원칙, 장소별 핵심 내용을 공유합니다.','Speaking practice, visitor guidelines, and key points for each stop.','#FF2D8D',2,true),
  ('20000000-0000-4000-8000-000000000003','public-media-kit','공개 홍보 자료','Public Media Kit','승인된 소개문, 로고, 공개용 이미지 자료를 모읍니다.','Approved descriptions, logos, and public-use image resources.','#0A9C78',3,true)
on conflict (id) do nothing;

insert into public.archive_entries
  (id, collection_id, entry_date, title_ko, title_en, subtitle_ko, subtitle_en, sort_order, is_published)
values
  ('21000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','2026-08-18','여름방학 방문단 투어','Summer Visitor Tour','예지관–창의인재관 순환 경로','Yeji–Chang-ui loop route',1,true),
  ('21000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','2026-03-09','신입 부원 기본 교육','New Member Essentials','첫 투어 전 체크리스트','Pre-tour checklist',1,true)
on conflict (id) do nothing;

insert into public.archive_blocks (id, entry_id, block_type, content, sort_order)
values
  ('22000000-0000-4000-8000-000000000001','21000000-0000-4000-8000-000000000001','paragraph','{"ko":"가상의 예시 기록입니다. 실제 운영 자료는 관리 화면에서 업로드하세요.","en":"Fictional sample content. Upload approved operational materials from the management screen."}',1),
  ('22000000-0000-4000-8000-000000000002','21000000-0000-4000-8000-000000000002','paragraph','{"ko":"시선, 속도, 안전한 이동 안내를 연습하는 가상의 교육 기록입니다.","en":"A fictional training record for eye contact, pacing, and safe movement guidance."}',1)
on conflict (id) do nothing;

insert into public.surveys
  (id, survey_number, slug, title_ko, title_en, description_ko, description_en, status, opens_at)
values
  ('30000000-0000-4000-8000-000000000001',1,'campus-visitor-tour','학교 방문 투어','Campus Visitor Tour','오늘의 투어 경험을 알려주세요. 응답은 익명입니다.','Tell us about today’s tour. Your response is anonymous.','published',now()),
  ('30000000-0000-4000-8000-000000000002',2,'international-exchange-tour','국제 교류단 투어','International Exchange Tour','영문 투어의 설명과 동선에 대한 의견을 받습니다.','Share feedback on the English-language route and presentation.','published',now())
on conflict (id) do nothing;

insert into public.survey_questions
  (id, survey_id, question_key, label_ko, label_en, question_type, is_required, options, condition_question_key, condition_equals, sort_order)
values
  ('31000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','satisfaction','투어에 얼마나 만족하셨나요?','How satisfied were you with the tour?','scale',true,'[]',null,null,1),
  ('31000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','language','투어에서 사용한 언어','Language used during the tour','single',true,'["한국어","English"]',null,null,2),
  ('31000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000001','english','학생들의 영어 설명은 어땠나요?','How would you rate the students’ English presentation?','scale',true,'[]','language','English',3),
  ('31000000-0000-4000-8000-000000000004','30000000-0000-4000-8000-000000000001','knowledge','학생들의 투어 내용 숙지도','How well did the students know the tour content?','scale',true,'[]',null,null,4),
  ('31000000-0000-4000-8000-000000000005','30000000-0000-4000-8000-000000000001','comment','그 밖에 전하고 싶은 의견','Anything else you would like to share?','long',false,'[]',null,null,5)
on conflict (id) do nothing;
