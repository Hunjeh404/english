create or replace function english_private.validate_reading() returns trigger language plpgsql security invoker set search_path='' as $$
declare image_key text;image_count integer:=0;file_size bigint;
begin
 if TG_OP='UPDATE' then
  if new.deleted_at is distinct from old.deleted_at then
   if old.id<>'2772be50-0190-4784-a381-371874ab5001'::uuid or old.deleted_at is not null or new.deleted_at is null or (to_jsonb(new)-'deleted_at') is distinct from (to_jsonb(old)-'deleted_at') then raise exception '확정된 본문과 음원은 수정할 수 없습니다';end if;
  elsif old.deleted_at is not null then
   if new.folder_id is not null or (to_jsonb(new)-'folder_id') is distinct from (to_jsonb(old)-'folder_id') then raise exception '삭제된 리딩은 수정할 수 없습니다';end if;
  elsif (to_jsonb(new)-'title'-'folder_id'-'body') is distinct from (to_jsonb(old)-'title'-'folder_id'-'body') or length(btrim(new.title)) not between 1 and 120 then
   raise exception '음원과 생성 정보는 수정할 수 없습니다';
  elsif new.body is distinct from old.body and old.voice<>'uploaded' then
   raise exception '직접 업로드한 음원의 본문만 수정할 수 있습니다';
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
grant update(body) on public.english_readings to authenticated;
