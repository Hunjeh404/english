import { requireGoogle } from '../../../lib/server-auth';
import { bindings, mutationGuard, fail, validId } from '../../../lib/server-store';
import { VOICES } from '../../../lib/reading-core';
import { DEFAULT_READING } from '../../../lib/default-reading';
export const dynamic = 'force-dynamic';
export async function GET(request:Request) {
  const user=await requireGoogle(request);if(user instanceof Response)return user;
  try { const { db } = bindings(); const d=DEFAULT_READING; await db.prepare('INSERT OR IGNORE INTO passages(id,title,body,voice,images,audio_key,duration,goal,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(d.id,d.title,d.body,d.voice,JSON.stringify(['default:original-1.jpg','default:original-2.jpg']),'default:reading.mp3',d.duration,d.goal,'2026-10-25T00:00:00.000Z').run(); if(user.email==='hyojong.yee@gmail.com')await db.prepare('UPDATE completions SET user_id=? WHERE user_id IS NULL').bind(user.id).run(); const result = await db.prepare('SELECT p.id,p.title,p.body,p.voice,p.images,p.duration,coalesce(lp.goal,p.goal) goal,p.created_at,(SELECT count(*) FROM completions c WHERE c.passage_id=p.id AND c.user_id=?) completed FROM passages p LEFT JOIN listening_preferences lp ON lp.passage_id=p.id AND lp.user_id=? WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC').bind(user.id,user.id).all(); return Response.json(result.results, { headers: { 'Cache-Control': 'no-store' } }); } catch (e) { return fail(e, 503); }
}
export async function POST(request: Request) {
  const denied = mutationGuard(request); if (denied) return denied;
  const user=await requireGoogle(request,true);if(user instanceof Response)return user;
  try {
    const { db, bucket } = bindings();
    if (Number(request.headers.get('content-length')) > 65 * 1024 * 1024) throw new Error('파일 전체 크기는 65MB 이하여야 합니다.');
    const form = await request.formData();
    const id = String(form.get('id') || ''), title = String(form.get('title') || '').trim(), body = String(form.get('body') || '').trim();
    const voice = String(form.get('voice') || ''), audio = form.get('audio'), duration = Number(form.get('duration')), goal = Number(form.get('goal'));
    const images = form.getAll('images');
    if (!validId(id) || !title || title.length > 120 || !body || body.length > 8000 || !(voice==='uploaded'||VOICES.some(v => v.id === voice))) throw new Error('제목·본문·음성을 확인해 주세요. 본문은 8,000자까지 가능합니다.');
    if (!Number.isInteger(goal) || goal < 1 || goal > 100 || !Number.isFinite(duration) || duration < (voice==='uploaded'?.1:3) || duration > 1200) throw new Error('목표 횟수 또는 음성 길이를 확인해 주세요.');
    if (!(audio instanceof File) || audio.size > 40 * 1024 * 1024 || audio.size < 100 || images.length > 8) throw new Error('음성은 40MB, 원본 사진은 8장까지 저장할 수 있습니다.');
    const header = new DataView(await audio.slice(0, 44).arrayBuffer());
    let contentType='audio/wav',extension='wav';
    if(voice==='uploaded'){const bytes=new Uint8Array(await audio.slice(0,16).arrayBuffer()),text=new TextDecoder().decode(bytes);
      if(text.startsWith('RIFF')&&text.slice(8,12)==='WAVE'){contentType='audio/wav';extension='wav';}
      else if(text.startsWith('ID3')||(bytes[0]===255&&(bytes[1]&224)===224)){contentType='audio/mpeg';extension='mp3';}
      else if(text.slice(4,8)==='ftyp'){contentType='audio/mp4';extension='m4a';}
      else if(text.startsWith('OggS')){contentType='audio/ogg';extension='ogg';}
      else if(text.startsWith('fLaC')){contentType='audio/flac';extension='flac';}
      else if(header.getUint32(0)===0x1a45dfa3){contentType='audio/webm';extension='webm';}
      else throw new Error('지원하지 않는 음원 형식입니다. MP3·WAV·M4A·OGG·FLAC·WebM을 사용해 주세요.');
    }else if (header.getUint32(0) !== 0x52494646 || header.getUint32(8) !== 0x57415645 || header.getUint16(20,true) !== 1 || header.getUint16(22,true) !== 1 || header.getUint32(24,true) !== 24000 || header.getUint16(34,true) !== 16 || Math.abs((audio.size-44)/48000-duration) > .1) throw new Error('생성된 WAV 음성 형식이 올바르지 않습니다.');
    for (const image of images) if (!(image instanceof File) || !['image/jpeg','image/png','image/webp'].includes(image.type) || image.size > 10 * 1024 * 1024) throw new Error('원본은 JPG·PNG·WEBP, 한 장에 10MB까지 가능합니다.');
    const existing = await db.prepare('SELECT id FROM passages WHERE id=?').bind(id).first();
    if (existing) return Response.json({ error: '이미 저장된 항목입니다. 새 항목으로 추가해 주세요.' }, { status: 409 });
    const keys: string[] = [], imageKeys: string[] = [], audioKey = `${id}/reading.${extension}`;
    try {
      for (let i=0; i<images.length; i++) { const f = images[i] as File, key = `${id}/original-${i}`; await bucket.put(key, f.stream(), { httpMetadata: { contentType: f.type } }); keys.push(key); imageKeys.push(key); }
      await bucket.put(audioKey, audio.stream(), { httpMetadata: { contentType } }); keys.push(audioKey);
      await db.prepare('INSERT INTO passages(id,title,body,voice,images,audio_key,duration,goal,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,title,body,voice,JSON.stringify(imageKeys),audioKey,duration,goal,new Date().toISOString()).run();
    } catch (e) { await Promise.allSettled(keys.map(k => bucket.delete(k))); throw e; }
    return Response.json({ id }, { status: 201 });
  } catch (e) { return fail(e); }
}
