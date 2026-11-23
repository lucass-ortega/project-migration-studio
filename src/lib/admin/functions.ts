import { createServerFn, createMiddleware } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { blockSchema, settingsSchema, vehicleSchema, statusSchema } from './rules';
import type { Tables } from '@/integrations/supabase/types';
const requireAdmin = createMiddleware({type:'function'}).middleware([requireSupabaseAuth]).server(async ({context,next})=>{
 const {data,error}=await context.supabase.rpc('has_role',{_user_id:context.userId,_role:'admin'});
 if(error || !data) throw new Error('Tu cuenta no tiene autorización para administrar Del Valle.');
 return next({context});
});
export const getAdminAccess=createServerFn({method:'GET'}).middleware([requireAdmin]).handler(async ({context})=>({userId:context.userId,email:String(context.claims['email']??'')}));
export type AdminReservation=Tables<'reservations'> & {customers:Tables<'customers'>;vehicles:Tables<'vehicles'>};
export type AdminVehicle=Tables<'vehicles'> & {display_images:string[]};
export const getAdminData=createServerFn({method:'GET'}).middleware([requireAdmin]).handler(async ({context})=>{
 const sb=context.supabase;
 // Explicit paging: Supabase limits each response to 1,000 rows.
 async function allReservations(){const result:AdminReservation[]=[];for(let start=0;;start+=500){const r=await sb.from('reservations').select('*,customers!inner(*),vehicles!inner(*)').order('created_at',{ascending:false}).range(start,start+499);if(r.error)throw new Error('No se pudieron cargar las solicitudes.');result.push(...r.data);if(r.data.length<500)break;}return result;}
 async function allBlocks(){const result:Tables<'vehicle_blocks'>[]=[];for(let start=0;;start+=500){const r=await sb.from('vehicle_blocks').select('*').order('start_at').range(start,start+499);if(r.error)throw new Error('No se pudieron cargar los bloqueos.');result.push(...r.data);if(r.data.length<500)break;}return result;}
 async function allVehicles(){const result:Tables<'vehicles'>[]=[];for(let start=0;;start+=500){const r=await sb.from('vehicles').select('*').order('sort_order').range(start,start+499);if(r.error)throw new Error('No se pudieron cargar los vehículos.');result.push(...r.data);if(r.data.length<500)break;}return result;}
 const [reservations,blocks,vehicleRows,s,logs]=await Promise.all([allReservations(),allBlocks(),allVehicles(),sb.from('business_settings').select('*').eq('id',1).single(),sb.from('admin_audit_log').select('*').order('created_at',{ascending:false}).limit(50)]);
 if(s.error)throw new Error('No se pudo cargar la configuración.');
 const vehicles:AdminVehicle[]=await Promise.all(vehicleRows.map(async v=>({...v,display_images:await Promise.all(v.images.map(async image=>{if(!image.startsWith('storage:vehicle-images/'))return image;const signed=await sb.storage.from('vehicle-images').createSignedUrl(image.slice('storage:vehicle-images/'.length),3600);return signed.data?.signedUrl??'';}))})));
 return {reservations,blocks,vehicles,settings:s.data,logs:logs.data??[],now:new Date().toISOString()};
});
export const changeStatus=createServerFn({method:'POST'}).middleware([requireAdmin]).inputValidator((x:unknown)=>z.object({id:z.string().uuid(),status:statusSchema,expectedStatus:statusSchema}).parse(x)).handler(async ({context,data})=>{
 const r=await context.supabase.from('reservations').update({status:data.status}).eq('id',data.id).eq('status',data.expectedStatus).select('id').maybeSingle();
 if(r.error)return {ok:false,message:r.error.message.startsWith('Conflicto')?r.error.message:'No se pudo cambiar el estado. Actualizá la lista e intentá nuevamente.'};
 return r.data?{ok:true,message:'Estado actualizado correctamente.'}:{ok:false,message:'Otra persona cambió esta solicitud. Actualizá la lista.'};
});
export const saveBlock=createServerFn({method:'POST'}).middleware([requireAdmin]).inputValidator((x:unknown)=>blockSchema.parse(x)).handler(async ({context,data})=>{
 const {id,...row}=data;
 const r=id?await context.supabase.from('vehicle_blocks').update(row).eq('id',id).select('id').maybeSingle():await context.supabase.from('vehicle_blocks').insert({...row,created_by:context.userId}).select('id').single();
 if(r.error)return {ok:false,message:r.error.message.startsWith('Conflicto')?r.error.message:'No se pudo guardar el bloqueo.'};
 return r.data?{ok:true,message:'Bloqueo guardado correctamente.'}:{ok:false,message:'El bloqueo ya no existe.'};
});
export const deleteBlock=createServerFn({method:'POST'}).middleware([requireAdmin]).inputValidator((x:unknown)=>z.object({id:z.string().uuid()}).parse(x)).handler(async ({context,data})=>{const r=await context.supabase.from('vehicle_blocks').delete().eq('id',data.id).select('id').maybeSingle();return {ok:!r.error && Boolean(r.data),message:r.error?'No se pudo eliminar el bloqueo.':r.data?'Bloqueo eliminado.':'El bloqueo ya no existe.'};});
export const saveVehicle=createServerFn({method:'POST'}).middleware([requireAdmin]).inputValidator((x:unknown)=>vehicleSchema.parse(x)).handler(async ({context,data})=>{const {id,...row}=data;const r=await context.supabase.from('vehicles').update(row).eq('id',id).select('id').maybeSingle();return {ok:!r.error&&Boolean(r.data),message:r.error?'No se pudo guardar el vehículo.':r.data?'Vehículo actualizado.':'El vehículo ya no existe.'};});
export const saveSettings=createServerFn({method:'POST'}).middleware([requireAdmin]).inputValidator((x:unknown)=>settingsSchema.parse(x)).handler(async ({context,data})=>{const r=await context.supabase.from('business_settings').update(data).eq('id',1).select('id').single();return {ok:!r.error,message:r.error?'No se pudo guardar la configuración.':'Configuración actualizada.'};});
export const adminQueryKey=['admin-data'] as const;
