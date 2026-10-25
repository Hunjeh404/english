import {requireGoogle} from '../../../../lib/server-auth';
import { bindings, fail, getPassage } from '../../../../lib/server-store';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string}>}) {
 const user=await requireGoogle(request);if(user instanceof Response)return user;
 try { const {id}=await context.params,{db,bucket}=bindings(),p=await getPassage(db,id);if(!p)return new Response('Not found',{status:404});
 const url=new URL(request.url),isAudio=url.searchParams.get('type')!=='image',index=Number(url.searchParams.get('index')||0);
 const key=isAudio?String(p.audio_key):(JSON.parse(String(p.images)) as string[])[index];if(!key)return new Response('Not found',{status:404});
 if(key.startsWith('default:'))return Response.redirect(new URL('/defaults/'+key.slice(8),request.url),302);
 const range=request.headers.get('range');const object=await bucket.get(key,range?{range:request.headers}:{});if(!object)return new Response('Not found',{status:404});
 const headers=new Headers({'Cache-Control':'private, no-store','Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff'});object.writeHttpMetadata(headers);headers.set('ETag',object.httpEtag);
 let status=200;if(range&&object.range&&'offset' in object.range&&'length' in object.range){const start=object.range.offset??0,length=object.range.length??object.size;headers.set('Content-Range',`bytes ${start}-${start+length-1}/${object.size}`);headers.set('Content-Length',String(length));status=206;}else headers.set('Content-Length',String(object.size));
 if(url.searchParams.get('download')==='1')headers.set('Content-Disposition',`attachment; filename="reading-${id}.${key.split('.').pop()||'audio'}"`);
 return new Response(object.body,{status,headers});}catch(e){return fail(e,503);}
}
