begin;
create table public.english_folders(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(btrim(name)) between 1 and 60),
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index english_folders_created_by_idx on public.english_folders(created_by);
alter table public.english_folders enable row level security;
revoke all on public.english_folders from public,anon,authenticated;
grant select,insert,delete on public.english_folders to authenticated;
grant update(name) on public.english_folders to authenticated;
create policy english_folder_read on public.english_folders for select to authenticated
 using((select english_private.verified_email()) is not null);
create policy english_folder_insert on public.english_folders for insert to authenticated
 with check((select english_private.can_upload()) and created_by=(select auth.uid()));
create policy english_folder_rename on public.english_folders for update to authenticated
 using((select english_private.can_upload())) with check((select english_private.can_upload()));
create policy english_folder_delete on public.english_folders for delete to authenticated
 using((select english_private.can_upload()));
alter table public.english_readings add column folder_id uuid references public.english_folders(id) on delete set null;
create index english_readings_folder_idx on public.english_readings(folder_id);
grant update(folder_id) on public.english_readings to authenticated;
-- Reset existing targets once, preserving all completion records.
-- The transaction's ALTER TABLE lock prevents writes while this trigger is disabled.
alter table public.english_readings disable trigger english_immutable;
update public.english_readings set goal=10 where goal<>10;
alter table public.english_readings enable trigger english_immutable;
update public.english_listening_preferences set goal=10 where goal<>10;
alter table public.english_readings alter column goal set default 10;
create or replace function english_private.validate_reading() returns trigger language plpgsql security invoker set search_path='' as $$
declare image_key text;image_count integer:=0;file_size bigint;
begin
 if TG_OP='UPDATE' then
  if new.deleted_at is distinct from old.deleted_at then
   if old.id<>'2772be50-0190-4784-a381-371874ab5001'::uuid or old.deleted_at is not null or new.deleted_at is null or (to_jsonb(new)-'deleted_at') is distinct from (to_jsonb(old)-'deleted_at') then raise exception '확정된 본문과 음원은 수정할 수 없습니다';end if;
  elsif old.deleted_at is not null then
   if new.folder_id is not null or (to_jsonb(new)-'folder_id') is distinct from (to_jsonb(old)-'folder_id') then raise exception '삭제된 리딩은 수정할 수 없습니다';end if;
  elsif (to_jsonb(new)-'title'-'folder_id') is distinct from (to_jsonb(old)-'title'-'folder_id') or length(btrim(new.title)) not between 1 and 120 then
   raise exception '제목과 폴더만 수정할 수 있습니다. 본문과 음원은 수정할 수 없습니다';
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
commit;
