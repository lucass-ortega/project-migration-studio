import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { getAdminAccess } from '@/lib/admin/functions';
export const Route=createFileRoute('/_authenticated')({ssr:false,beforeLoad:async()=>{const {data}=await supabase.auth.getUser();if(!data.user)throw redirect({to:'/login'});try{const access=await getAdminAccess();return {adminUser:access};}catch{throw redirect({to:'/login',search:{denied:true}});}},component:Outlet});
