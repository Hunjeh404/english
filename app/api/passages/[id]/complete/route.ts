import { bindings, mutationGuard, fail, validId } from '../../../../../lib/server-store';
export async function POST(request:Request, context:{params:Promise<{id:string}>}) {
 const denied=mutationGuard(request);if(denied)return denied;
 try {const {id}=await context.params;const {playId}=await request.json() as {playId:string};if(!validId(id)||!validId(playId))throw new Error('재생 기록이 올바르지 않습니다.');const {db}=bindings();
 const active=await db.prepare('SELECT id FROM passages WHERE id=? AND deleted_at IS NULL').bind(id).first();if(!active)return Response.json({error:'삭제된 항목입니다.'},{status:404});
 const [,count]=await db.batch([db.prepare('INSERT OR IGNORE INTO completions(id,passage_id,created_at) SELECT ?,id,? FROM passages WHERE id=? AND deleted_at IS NULL').bind(playId,new Date().toISOString(),id),db.prepare('SELECT count(*) completed FROM completions WHERE passage_id=?').bind(id)]);
 return Response.json({completed:(count.results[0] as {completed?:number}|undefined)?.completed??0});}catch(e){return fail(e);}
}
