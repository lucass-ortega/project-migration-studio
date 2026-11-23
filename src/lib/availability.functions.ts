import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
export const getOccupiedPeriods=createServerFn({method:'GET'}).inputValidator((x:unknown)=>z.object({start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true})}).refine(v=>new Date(v.end)>new Date(v.start)&&new Date(v.end).getTime()-new Date(v.start).getTime()<=730*86400000,'Elegí un período válido de hasta dos años.').parse(x)).handler(async ({data})=>{
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 const r=await supabaseAdmin.rpc('public_occupied_periods',{_start:data.start,_end:data.end});
 if(r.error)throw new Error('No se pudo comprobar la disponibilidad.');
 return r.data;
});
