alter table public.english_readings drop constraint english_readings_body_check;
alter table public.english_readings add constraint english_readings_body_check
 check(length(body)<=8000 and (length(btrim(body))>=1 or voice='uploaded'));
