export type GoogleAccount={id:string;email:string;canUpload:boolean};
const UPLOAD_EMAILS=new Set(['hyojong.yee@gmail.com','yelea.nho@gmail.com']);
export function accountFromVerifiedUser(value:unknown):GoogleAccount|null {
 if(!value||typeof value!=='object')return null;
 const u=value as {id?:unknown;email?:unknown;email_confirmed_at?:unknown;identities?:{provider?:unknown}[]};
 if(typeof u.id!=='string'||typeof u.email!=='string'||!u.email_confirmed_at||!Array.isArray(u.identities)||!u.identities.some(i=>i.provider==='google'))return null;
 const email=u.email.trim().toLowerCase();
 return {id:u.id,email,canUpload:UPLOAD_EMAILS.has(email)};
}
