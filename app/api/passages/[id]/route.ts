import { bindings, mutationGuard, fail, validId, getPassage } from '../../../../lib/server-store';
import {requireGoogle} from '../../../../lib/server-auth';
import { DEFAULT_READING } from '../../../../lib/default-reading';
export const dynamic='force-dynamic';
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){
 const denied=mutationGuard(request);if(denied)return denied;
 const user=await requireGoogle(request);if(user instanceof Response)return user;
 try{
  const {id}=await context.params;if(!validId(id))throw new Error('잘못된 항목입니다.');
  const payload=await request.json() as Record<string,unknown>;
  if(Object.keys(payload).some(k=>k!=='goal'))return Response.json({error:'확정된 제목·본문·음성·원본은 수정할 수 없습니다.'},{status:409});
  const goal=Number(payload.goal);if(!Number.isInteger(goal)||goal<1||goal>100)throw new Error('목표는 1~100회로 설정해 주세요.');
  const {db}=bindings();if(!await getPassage(db,id))return Response.json({error:'항목을 찾을 수 없습니다.'},{status:404});
  await db.prepare('INSERT INTO listening_preferences(id,user_id,passage_id,goal) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET goal=excluded.goal').bind(user.id+':'+id,user.id,id,goal).run();
  return Response.json({goal});
 }catch(e){return fail(e);}
}
export async function DELETE(request:Request,context:{params:Promise<{id:string}>}){
 const denied=mutationGuard(request);if(denied)return denied;
 const user=await requireGoogle(request,true);if(user instanceof Response)return user;
 try{
  const {id}=await context.params,{db,bucket}=bindings(),p=await getPassage(db,id);
  if(!p)return Response.json({error:'항목을 찾을 수 없습니다.'},{status:404});
  await db.prepare('UPDATE passages SET deleted_at=? WHERE id=?').bind(new Date().toISOString(),id).run();
  if(id===DEFAULT_READING.id){await db.batch([db.prepare('DELETE FROM completions WHERE passage_id=?').bind(id),db.prepare('DELETE FROM listening_preferences WHERE passage_id=?').bind(id)]);return Response.json({deleted:true});}
  await bucket.delete([String(p.audio_key),...JSON.parse(String(p.images))]);
  await db.batch([db.prepare('DELETE FROM completions WHERE passage_id=?').bind(id),db.prepare('DELETE FROM listening_preferences WHERE passage_id=?').bind(id),db.prepare('DELETE FROM passages WHERE id=?').bind(id)]);
  return Response.json({deleted:true});
 }catch(e){return fail(e);}
}
