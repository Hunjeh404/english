import {bindings,mutationGuard,fail,validId} from '../../../../../lib/server-store';
import {requireGoogle} from '../../../../../lib/server-auth';
export async function POST(request:Request,context:{params:Promise<{id:string}>}){
 const denied=mutationGuard(request);if(denied)return denied;
 const user=await requireGoogle(request);if(user instanceof Response)return user;
 try{
  const {id}=await context.params,{playId}=await request.json() as {playId:string};
  if(!validId(id)||!validId(playId))throw new Error('재생 기록이 올바르지 않습니다.');
  const {db}=bindings();
  if(!await db.prepare('SELECT id FROM passages WHERE id=? AND deleted_at IS NULL').bind(id).first())return Response.json({error:'삭제된 항목입니다.'},{status:404});
  const [,count]=await db.batch([
   db.prepare('INSERT OR IGNORE INTO completions(id,passage_id,user_id,created_at) SELECT ?,id,?,? FROM passages WHERE id=? AND deleted_at IS NULL').bind(playId,user.id,new Date().toISOString(),id),
   db.prepare('SELECT count(*) completed FROM completions WHERE passage_id=? AND user_id=?').bind(id,user.id),
  ]);
  return Response.json({completed:(count.results[0] as {completed:number}|undefined)?.completed??0});
 }catch(e){return fail(e);}
}
