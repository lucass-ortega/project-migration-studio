import { createFileRoute } from '@tanstack/react-router';
import { AuthForm } from '@/components/admin/auth-form';
import { adminHead } from '@/lib/admin/rules';
export const Route=createFileRoute('/auth')({head:()=>adminHead('Acceso de propietarios'),validateSearch:(s:Record<string,unknown>):{denied?:boolean}=>s['denied']===true||s['denied']==='true'?{denied:true}:{},component:OwnerAuthPage});
function OwnerAuthPage(){const {denied}=Route.useSearch();return <AuthForm denied={denied??false}/>;}
