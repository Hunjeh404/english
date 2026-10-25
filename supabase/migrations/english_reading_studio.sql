-- English Reading Studio: isolated from the existing Sudoku/Brush tables.
create schema if not exists english_private;
revoke all on schema english_private from public;
grant usage on schema english_private to authenticated;
-- RLS needs the authoritative auth tables; never trust user-editable user_metadata.
create function english_private.verified_email() returns text
language sql stable security definer set search_path='' as $$
 select lower(u.email) from auth.users u where u.id=(select auth.uid())
 and u.email_confirmed_at is not null
 and exists(select 1 from auth.identities i where i.user_id=u.id and i.provider='google')
$$;
create function english_private.can_upload() returns boolean
language sql stable security invoker set search_path='' as $$
 select coalesce(english_private.verified_email() in ('hyojong.yee@gmail.com','yelea.nho@gmail.com'),false)
$$;
revoke all on all functions in schema english_private from public,anon;
grant execute on all functions in schema english_private to authenticated;
create table public.english_readings(
 id uuid primary key,title text not null check(length(title) between 1 and 120),
 body text not null check(length(body) between 1 and 8000),
 voice text not null check(voice in ('bf_emma','bf_isabella','bm_george','bm_fable','uploaded')),
 images jsonb not null default '[]' check(jsonb_typeof(images)='array' and jsonb_array_length(images)<=8),
 audio_key text not null,duration double precision not null check(duration between 0.1 and 1200),
 goal integer not null default 5 check(goal between 1 and 100),created_at timestamptz not null default now(),
 created_by uuid references auth.users(id),deleted_at timestamptz
);
create table public.english_listening_preferences(
 user_id uuid not null references auth.users(id) on delete cascade,
 passage_id uuid not null references public.english_readings(id) on delete cascade,
 goal integer not null check(goal between 1 and 100),primary key(user_id,passage_id)
);
create table public.english_completions(
 id uuid primary key,user_id uuid not null references auth.users(id) on delete cascade,
 passage_id uuid not null references public.english_readings(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index english_completions_user_passage_idx on public.english_completions(user_id,passage_id);
create index english_preferences_passage_idx on public.english_listening_preferences(passage_id);
create index english_readings_created_by_idx on public.english_readings(created_by);
alter table public.english_readings enable row level security;
alter table public.english_listening_preferences enable row level security;
alter table public.english_completions enable row level security;
revoke all on public.english_readings,public.english_listening_preferences,public.english_completions from anon,authenticated;
grant select,insert,delete on public.english_readings to authenticated;
grant update(deleted_at) on public.english_readings to authenticated;
grant select,insert,update on public.english_listening_preferences to authenticated;
grant select,insert on public.english_completions to authenticated;
create policy english_read on public.english_readings for select to authenticated
 using((select english_private.verified_email()) is not null and (deleted_at is null or (select english_private.can_upload())));
create policy english_insert on public.english_readings for insert to authenticated
 with check((select english_private.can_upload()) and created_by=(select auth.uid()) and deleted_at is null);
create policy english_delete on public.english_readings for delete to authenticated using((select english_private.can_upload()));
create policy english_hide_default on public.english_readings for update to authenticated
 using((select english_private.can_upload()) and id='2772be50-0190-4784-a381-371874ab5001' and deleted_at is null)
 with check((select english_private.can_upload()) and id='2772be50-0190-4784-a381-371874ab5001' and deleted_at is not null);
create policy english_pref_read on public.english_listening_preferences for select to authenticated
 using(user_id=(select auth.uid()) and (select english_private.verified_email()) is not null);
create policy english_pref_insert on public.english_listening_preferences for insert to authenticated
 with check(user_id=(select auth.uid()) and (select english_private.verified_email()) is not null and exists(select 1 from public.english_readings r where r.id=passage_id and r.deleted_at is null));
create policy english_pref_update on public.english_listening_preferences for update to authenticated
 using(user_id=(select auth.uid()) and (select english_private.verified_email()) is not null)
 with check(user_id=(select auth.uid()) and (select english_private.verified_email()) is not null);
create policy english_count_read on public.english_completions for select to authenticated
 using(user_id=(select auth.uid()) and (select english_private.verified_email()) is not null);
create policy english_count_insert on public.english_completions for insert to authenticated
 with check(user_id=(select auth.uid()) and (select english_private.verified_email()) is not null and exists(select 1 from public.english_readings r where r.id=passage_id and r.deleted_at is null));
create function public.english_list_readings() returns jsonb language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object('goal',coalesce(lp.goal,p.goal),'completed',
 (select count(*) from public.english_completions c where c.passage_id=p.id and c.user_id=(select auth.uid()))) order by p.created_at desc),'[]'::jsonb)
 from public.english_readings p left join public.english_listening_preferences lp on lp.passage_id=p.id and lp.user_id=(select auth.uid()) where p.deleted_at is null
$$;
revoke all on function public.english_list_readings() from public,anon;
grant execute on function public.english_list_readings() to authenticated;
-- SEED_DATA is injected from the original photographed passage before the immutable trigger is installed.
INSERT INTO public.english_readings(id,title,body,voice,images,audio_key,duration,goal,created_at) VALUES('2772be50-0190-4784-a381-371874ab5001','Unusual Laws Around the World','Laws are an important part of society. They keep people safe, maintain order, and encourage healthy relationships between citizens. However, not all laws are created equal. You might be surprised at the unusual laws some governments enforce.

Some laws are sensible, but have extreme consequences. Cheating on exams is unwelcome everywhere. But a high school student in Bangladesh could be jailed if caught cheating on a final exam. It is good for everyone to smile. Especially, the people of Milan think that smiling is very important. Therefore, you could be charged a fine for frowning in Milan.

In some cases, unusual laws exist to respect special political figures. In Thailand, it is illegal to step on money because the bills have the face of the king. Even political animals get special treatment. In Great Britain, you cannot have your pet mate with any of the royal animals. Animal laws in France are even more unique than those of Britain. In France, it is illegal to name a pig Napoleon, because that is insulting to the famous Napoleon Bonaparte.

Other interesting laws seem to make no sense at all. In Switzerland, it is illegal to flush the toilet after 10pm. In England, it is against the law to import potatoes—but only if they are from Poland! Perhaps the most interesting, though, is the law in Oklahoma. It says that one may not have a sleeping donkey in one''s bathtub after 7pm.

The laws above seem ridiculous, but they might be the mirrors of each culture. Although you cannot be expected to know every single unknown rule out there, you can still try to respect the laws. So if you ever find a donkey in a bathtub in Oklahoma, be sure to wake it up at 6:59.','bf_emma','["default:original-1.jpg","default:original-2.jpg"]','default:reading.mp3',122.352,5,'2026-10-25T00:00:00Z');
INSERT INTO public.english_listening_preferences(user_id,passage_id,goal) SELECT id,'2772be50-0190-4784-a381-371874ab5001',10 FROM auth.users WHERE lower(email)='hyojong.yee@gmail.com';
create function english_private.validate_reading() returns trigger language plpgsql security invoker set search_path='' as $$
declare image_key text;image_count integer:=0;file_size bigint;
begin
 if TG_OP='UPDATE' then
  if (to_jsonb(new)-'deleted_at') is distinct from (to_jsonb(old)-'deleted_at') or old.deleted_at is not null or new.deleted_at is null then
   raise exception '확정된 본문과 음원은 수정할 수 없습니다';
  end if;
  return new;
 end if;
 if new.audio_key !~ ('^'||new.id::text||'/reading\.(wav|mp3|m4a|ogg|flac|webm)$') then raise exception '잘못된 음원 경로입니다';end if;
 select (o.metadata->>'size')::bigint into file_size from storage.objects o where o.bucket_id='english-readings' and o.name=new.audio_key;
 if file_size is null or file_size<100 or file_size>41943040 then raise exception '음원 업로드를 먼저 완료해 주세요';end if;
 for image_key in select jsonb_array_elements_text(new.images) loop
  if image_key !~ ('^'||new.id::text||'/original-[0-7]\.(jpg|png|webp)$') then raise exception '잘못된 사진 경로입니다';end if;
  select (o.metadata->>'size')::bigint into file_size from storage.objects o where o.bucket_id='english-readings' and o.name=image_key;
  if file_size is null or file_size<1 or file_size>10485760 then raise exception '사진은 장당 10MB 이하여야 합니다';end if;
  image_count:=image_count+1;
 end loop;
 if image_count<>(select count(distinct value) from jsonb_array_elements_text(new.images)) then raise exception '사진 경로가 중복됩니다';end if;
 return new;
end $$;
revoke all on function english_private.validate_reading() from public,anon,authenticated;
create trigger english_immutable before insert or update on public.english_readings for each row execute function english_private.validate_reading();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('english-readings','english-readings',false,41943040,array['audio/wav','audio/x-wav','audio/mpeg','audio/mp4','audio/ogg','audio/flac','audio/webm','image/jpeg','image/png','image/webp']);
create policy english_media_select on storage.objects for select to authenticated using(
 bucket_id='english-readings' and (select english_private.verified_email()) is not null and
 ((select english_private.can_upload()) or exists(select 1 from public.english_readings r where r.deleted_at is null and (r.audio_key=name or r.images ? name)))
);
create policy english_media_insert on storage.objects for insert to authenticated with check(
 bucket_id='english-readings' and (select english_private.can_upload()) and
 name ~ '^[a-f0-9-]{36}/(reading\.(wav|mp3|m4a|ogg|flac|webm)|original-[0-7]\.(jpg|png|webp))$' and
 not exists(select 1 from public.english_readings r where r.id::text=split_part(name,'/',1))
);
create policy english_media_delete on storage.objects for delete to authenticated using(
 bucket_id='english-readings' and (select english_private.can_upload()) and
 not exists(select 1 from public.english_readings r where r.deleted_at is null and (r.audio_key=name or r.images ? name))
);
