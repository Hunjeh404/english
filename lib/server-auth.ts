import { SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY } from './auth-config';
import { accountFromVerifiedUser,type GoogleAccount } from './access-policy';
export const AUTH_COOKIE='reading_access';
export function accessToken(request:Request):string|null {
 const authorization=request.headers.get('authorization');
 if(authorization)return /^Bearer\s+([^\s]+)$/i.exec(authorization)?.[1]||null;
 const part=request.headers.get('cookie')?.split(';').map(c=>c.trim()).find(c=>c.startsWith(AUTH_COOKIE+'='));
 if(!part)return null;
 try{return decodeURIComponent(part.slice(AUTH_COOKIE.length+1));}catch{return null;}
}
export async function requireGoogle(request:Request,uploader=false,fetcher:typeof fetch=fetch):Promise<GoogleAccount|Response>{
 const token=accessToken(request);
 if(!token||token.length>8192)return Response.json({error:'구글 로그인이 필요합니다.'},{status:401,headers:{'Cache-Control':'no-store'}});
 try {
  // Never authorize from browser claims, decoded JWT payloads or user_metadata.
  const response=await fetcher(SUPABASE_URL+'/auth/v1/user',{headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token},signal:AbortSignal.timeout(12000)});
  if(!response.ok)return Response.json({error:response.status===401||response.status===403?'로그인이 만료되었습니다. 다시 로그인해 주세요.':'로그인 서버에 연결하지 못했습니다.'},{status:response.status===401||response.status===403?401:503,headers:{'Cache-Control':'no-store'}});
  const user=accountFromVerifiedUser(await response.json());
  if(!user)return Response.json({error:'이메일이 확인된 구글 계정으로 로그인해 주세요.'},{status:403});
  if(uploader&&!user.canUpload)return Response.json({error:'이 계정은 서버 업로드·삭제 권한이 없습니다.'},{status:403});
  return user;
 }catch{return Response.json({error:'로그인 서버 연결을 확인해 주세요.'},{status:503});}
}
export function authCookie(token:string,request:Request,clear=false){
 let age=3600;
 try{const payload=JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))) as {exp?:number};if(payload.exp)age=Math.max(0,Math.min(3600,payload.exp-Math.floor(Date.now()/1000)));}catch{}
 return `${AUTH_COOKIE}=${clear?'':encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${clear?0:age}${new URL(request.url).protocol==='https:'?'; Secure':''}`;
}
