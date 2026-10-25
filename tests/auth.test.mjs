import test from 'node:test';
import assert from 'node:assert/strict';
import {accountFromVerifiedUser} from '../lib/access-policy.ts';
import {requireGoogle,accessToken} from '../lib/server-auth.ts';
const user=(email)=>({id:'user-1',email,email_confirmed_at:'2026-10-25',identities:[{provider:'google'}]});
test('only the two verified Google addresses may upload; metadata cannot grant permission',()=>{
 for(const email of ['hyojong.yee@gmail.com','yelea.nho@gmail.com'])assert.equal(accountFromVerifiedUser(user(email)).canUpload,true);
 assert.equal(accountFromVerifiedUser({...user('other@gmail.com'),user_metadata:{email:'hyojong.yee@gmail.com',canUpload:true}}).canUpload,false);
 assert.equal(accountFromVerifiedUser({...user('hyojong.yee@gmail.com'),email_confirmed_at:null}),null);
 assert.equal(accountFromVerifiedUser({...user('hyojong.yee@gmail.com'),identities:[{provider:'email'}]}),null);
});
test('server authorization rejects absent, forged, non-Google and unauthorized upload sessions',async()=>{
 const request=new Request('https://example.com/api/passages',{headers:{Authorization:'Bearer opaque'}});
 assert.equal((await requireGoogle(new Request(request.url))).status,401);
 assert.equal((await requireGoogle(request,true,async()=>new Response('',{status:401}))).status,401);
 assert.equal((await requireGoogle(request,true,async()=>Response.json(user('other@gmail.com')))).status,403);
 assert.equal((await requireGoogle(request,false,async()=>Response.json({...user('hyojong.yee@gmail.com'),identities:[]}))).status,403);
 const result=await requireGoogle(request,true,async(url,options)=>{assert.ok(url.endsWith('/auth/v1/user'));assert.equal(options.headers.Authorization,'Bearer opaque');return Response.json(user('hyojong.yee@gmail.com'));});assert.equal(result.canUpload,true);
});
test('malformed bearer cannot fall back to a privileged cookie',()=>{assert.equal(accessToken(new Request('https://example.com',{headers:{Authorization:'bad',cookie:'reading_access=token'}})),null);});
