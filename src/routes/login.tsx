import { createFileRoute, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/admin/auth-form';
import { getAdminAccess } from '@/lib/admin/functions';
import { adminHead } from '@/lib/admin/rules';
export const Route=createFileRoute('/login')({ssr:false,head:()=>adminHead('Acceso administrativo'),validateSearch:(s:Record<string,unknown>):{denied?:boolean}=>s['denied']===true||s['denied']==='true'?{denied:true}:{},beforeLoad:async()=>{const {data}=await supabase.auth.getUser();if(!data.user)return;let ok=false;try{await getAdminAccess();ok=true;}catch{ok=false;}if(ok)throw redirect({to:'/admin'});},component:AdminLoginPage});
function AdminLoginPage(){const {denied}=Route.useSearch();return <AuthForm denied={denied??false}/>;}
