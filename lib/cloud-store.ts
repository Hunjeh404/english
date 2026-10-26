import {getAuthClient} from './supabase-client';
import {accountFromVerifiedUser} from './access-policy';
import type {Passage} from './reading-core';
export const BUCKET='english-readings';
export const asset=(path:string)=>import.meta.env.BASE_URL+path.replace(/^\//,'');
const mediaCache=new Map<string,string>();
const unwrap=<T>(result:{data:T;error:{message:string}|null})=>{if(result.error)throw new Error(result.error.message);return result.data;};
export async function verifyAccount(){const {data,error}=await getAuthClient().auth.getUser();if(error)throw error;const account=accountFromVerifiedUser(data.user);if(!account)throw new Error('이메일이 확인된 구글 계정으로 로그인해 주세요.');return account;}
export function clearMedia(){mediaCache.clear();}
export function mediaUrl(p:Passage,type='audio',index=0){if(p.id==='2772be50-0190-4784-a381-371874ab5001')return asset(type==='image'?`defaults/original-${index+1}.jpg`:'defaults/reading.mp3');const keys=JSON.parse(p.images) as string[];return mediaCache.get(type==='image'?keys[index]:(p as Passage&{audio_key:string}).audio_key)||'';}
export async function cloudApi(url:string,options?:RequestInit):Promise<unknown>{
 const c=getAuthClient(),method=options?.method||'GET';
 if(url==='/api/folders'){
  if(method==='GET')return unwrap(await c.from('english_folders').select('id,name').order('name'));
  const user=await verifyAccount();if(!user.canUpload)throw new Error('폴더 관리 권한이 없습니다.');
  const payload=JSON.parse(String(options?.body||'{}'));
  if(method==='POST'){const name=String(payload.name||'').trim();if(!name||name.length>60)throw new Error('폴더 이름은 1~60자로 입력해 주세요.');return unwrap(await c.from('english_folders').insert({name,created_by:user.id}).select('id,name').single());}
 }
 const folderMatch=/^\/api\/folders\/([a-f\d-]{36})$/.exec(url);
 if(folderMatch){
  const user=await verifyAccount();if(!user.canUpload)throw new Error('폴더 관리 권한이 없습니다.');
  if(method==='PATCH'){const payload=JSON.parse(String(options?.body||'{}')),name=String(payload.name||'').trim();if(!name||name.length>60)throw new Error('폴더 이름은 1~60자로 입력해 주세요.');return unwrap(await c.from('english_folders').update({name}).eq('id',folderMatch[1]).select('id,name').single());}
  if(method==='DELETE'){unwrap(await c.from('english_folders').delete().eq('id',folderMatch[1]));return {deleted:true};}
 }
 if(url==='/api/passages'&&method==='GET'){
  const rows=unwrap(await c.rpc('english_list_readings')) as (Omit<Passage,'images'>&{images:string[];audio_key:string})[];
  const paths=[...new Set(rows.flatMap(r=>[r.audio_key,...r.images]).filter(k=>!k.startsWith('default:')))];
  if(paths.length){const signed=unwrap(await c.storage.from(BUCKET).createSignedUrls(paths,60*60*24));for(const entry of signed||[])if(entry.path&&entry.signedUrl)mediaCache.set(entry.path,entry.signedUrl);}
  return rows.map(r=>({...r,images:JSON.stringify(r.images)}));
 }
 if(url==='/api/passages'&&method==='POST')return saveReading(options!.body as FormData);
 const match=/^\/api\/passages\/([a-f\d-]{36})(\/complete)?$/.exec(url);if(!match)throw new Error('지원하지 않는 요청입니다.');
 const id=match[1],payload=options?.body?JSON.parse(String(options.body)):{};
 if(method==='PATCH'){
  const user=await verifyAccount(),keys=Object.keys(payload);
  if(keys.length===1&&keys[0]==='body'){
   if(!user.canUpload)throw new Error('본문 수정 권한이 없습니다.');
   if(typeof payload.body!=='string'||payload.body.length>8000)throw new Error('본문은 8,000자 이하로 입력해 주세요.');
   const body=payload.body.trim();unwrap(await c.from('english_readings').update({body}).eq('id',id).eq('voice','uploaded').is('deleted_at',null).select('id').single());return {body};
  }
  if(keys.length===1&&keys[0]==='folder_id'){
   if(!user.canUpload)throw new Error('폴더 이동 권한이 없습니다.');const folder_id=payload.folder_id;
   if(folder_id!==null&&(typeof folder_id!=='string'||!/^[a-f\d-]{36}$/.test(folder_id)))throw new Error('폴더를 확인해 주세요.');
   unwrap(await c.from('english_readings').update({folder_id}).eq('id',id).is('deleted_at',null).select('id').single());return {folder_id};
  }
  if(keys.length===1&&keys[0]==='title'){
   if(!user.canUpload)throw new Error('제목 수정 권한이 없습니다.');const title=String(payload.title||'').trim();if(!title||title.length>120)throw new Error('제목은 1~120자로 입력해 주세요.');
   const changed=unwrap(await c.from('english_readings').update({title}).eq('id',id).is('deleted_at',null).select('id').single());if(!changed)throw new Error('항목을 찾을 수 없습니다.');return {title};
  }
  if(keys.length!==1||keys[0]!=='goal')throw new Error('확정한 본문은 수정할 수 없습니다.');
  unwrap(await c.from('english_listening_preferences').upsert({user_id:user.id,passage_id:id,goal:payload.goal}));return {goal:payload.goal};
 }
 if(method==='POST'&&match[2]){const user=await verifyAccount();unwrap(await c.from('english_completions').upsert({id:payload.playId,passage_id:id,user_id:user.id},{onConflict:'id',ignoreDuplicates:true}));return {completed:0};}
 if(method==='DELETE'){
  const account=await verifyAccount();if(!account.canUpload)throw new Error('삭제 권한이 없습니다.');
  const row=unwrap(await c.from('english_readings').select('audio_key,images').eq('id',id).single());
  if(id==='2772be50-0190-4784-a381-371874ab5001')unwrap(await c.from('english_readings').update({deleted_at:new Date().toISOString()}).eq('id',id));else unwrap(await c.from('english_readings').delete().eq('id',id));
  if(!row)throw new Error('항목을 찾을 수 없습니다.');
  const keys=[row.audio_key,...row.images].filter((k:string)=>!k.startsWith('default:'));
  if(keys.length)unwrap(await c.storage.from(BUCKET).remove(keys));return {deleted:true};
 }
 throw new Error('지원하지 않는 요청입니다.');
}
async function saveReading(form:FormData){
 const c=getAuthClient(),user=await verifyAccount();if(!user.canUpload)throw new Error('서버 업로드 권한이 없습니다.');
 const id=String(form.get('id')),audio=form.get('audio') as File,images=form.getAll('images') as File[];
 const title=String(form.get('title')||'').trim(),body=String(form.get('body')||'').trim(),voice=String(form.get('voice')||'');
 if(!/^[a-f\d-]{36}$/.test(id)||!title||(!body&&voice!=='uploaded')||title.length>120||body.length>8000)throw new Error('제목과 본문을 확인해 주세요.');
 if(!(audio instanceof Blob)||audio.size>40*1024*1024||images.length>8)throw new Error('음원은 40MB, 사진은 8장까지 가능합니다.');
 const bytes=new Uint8Array(await audio.slice(0,16).arrayBuffer()),text=new TextDecoder().decode(bytes);let extension='',contentType='';
 if(text.startsWith('RIFF')&&text.slice(8,12)==='WAVE'){extension='wav';contentType='audio/wav';}
 else if(text.startsWith('ID3')||(bytes[0]===255&&(bytes[1]&224)===224)){extension='mp3';contentType='audio/mpeg';}
 else if(text.slice(4,8)==='ftyp'){extension='m4a';contentType='audio/mp4';}
 else if(text.startsWith('OggS')){extension='ogg';contentType='audio/ogg';}
 else if(text.startsWith('fLaC')){extension='flac';contentType='audio/flac';}
 else if(bytes[0]===26&&bytes[1]===69&&bytes[2]===223&&bytes[3]===163){extension='webm';contentType='audio/webm';}
 else throw new Error('지원하지 않는 음원 형식입니다.');
 // A successful response may have been lost. Never remove media for an already published immutable reading.
 const existing=unwrap(await c.from('english_readings').select('id,deleted_at').eq('id',id).maybeSingle());if(existing){if(existing.deleted_at)throw new Error('삭제된 항목입니다. 새 항목으로 추가해 주세요.');return {id};}
 const uploaded:string[]=[],imageKeys:string[]=[],audioKey=`${id}/reading.${extension}`;
 try{
  unwrap(await c.storage.from(BUCKET).upload(audioKey,audio,{contentType,upsert:false}));uploaded.push(audioKey);
  for(let i=0;i<images.length;i++){const f=images[i];if(!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024)throw new Error('사진은 JPG·PNG·WEBP, 장당 10MB까지 가능합니다.');const key=`${id}/original-${i}.${f.type==='image/jpeg'?'jpg':f.type.split('/')[1]}`;unwrap(await c.storage.from(BUCKET).upload(key,f,{contentType:f.type,upsert:false}));uploaded.push(key);imageKeys.push(key);}
  unwrap(await c.from('english_readings').insert({id,title,body,voice,images:imageKeys,audio_key:audioKey,duration:Number(form.get('duration')),goal:Number(form.get('goal')||10),folder_id:form.get('folder_id')||null,created_by:user.id}));return {id};
 }catch(e){const check=await c.from('english_readings').select('id,deleted_at').eq('id',id).maybeSingle();if(check.data&&!check.data.deleted_at)return {id};if(!check.error&&uploaded.length)await c.storage.from(BUCKET).remove(uploaded);throw e;}
}
