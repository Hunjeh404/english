import {requireGoogle,authCookie,accessToken} from '../../../../lib/server-auth';
import {mutationGuard} from '../../../../lib/server-store';
export const dynamic='force-dynamic';
export async function POST(request:Request){
 const denied=mutationGuard(request);if(denied)return denied;
 const user=await requireGoogle(request);if(user instanceof Response)return user;
 return Response.json(user,{headers:{'Set-Cookie':authCookie(accessToken(request)!,request),'Cache-Control':'no-store','Vary':'Cookie,Authorization'}});
}
export async function DELETE(request:Request){
 const denied=mutationGuard(request);if(denied)return denied;
 return Response.json({signedOut:true},{headers:{'Set-Cookie':authCookie('',request,true),'Cache-Control':'no-store'}});
}
