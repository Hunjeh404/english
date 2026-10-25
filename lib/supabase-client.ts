import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import {SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY} from './auth-config';
let client:SupabaseClient|null=null;
export function getAuthClient(){
 return client??=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'english-google-auth'}});
}
