import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAdminData,Title,Field,field } from '@/components/admin/shared';
import { saveSettings } from '@/lib/admin/functions';
import { adminQuery } from '@/lib/admin/query';
import { adminHead,settingsSchema } from '@/lib/admin/rules';
export const Route=createFileRoute('/_authenticated/admin/configuracion')({head:()=>adminHead('Configuración'),component:Settings});
function Settings(){const data=useAdminData();const qc=useQueryClient();const save=useServerFn(saveSettings);const [number,setNumber]=useState(data.settings.whatsapp_number??'');const [type,setType]=useState(data.settings.deposit_type??'percent');const [value,setValue]=useState(String(data.settings.deposit_value??''));const [busy,setBusy]=useState(false);const [error,setError]=useState('');async function submit(e:React.FormEvent){e.preventDefault();const parsed=settingsSchema.safeParse({whatsapp_number:number,deposit_type:type,deposit_value:Number(value)});if(!parsed.success){setError(parsed.error.issues[0]?.message??'Revisá los datos.');return;}setBusy(true);setError('');try{const r=await save({data:parsed.data});if(!r.ok){setError(r.message);return;}toast.success(r.message);await qc.invalidateQueries({queryKey:adminQuery.queryKey});await qc.invalidateQueries({queryKey:['catalog']});}catch{setError('No se pudo guardar la configuración.');}finally{setBusy(false);}}
return <><Title title="Configuración del negocio"/><form onSubmit={submit} className="max-w-xl space-y-6"><Field label="WhatsApp comercial"><input required type="tel" className={field} value={number} onChange={e=>setNumber(e.target.value)}/></Field><Field label="Tipo de seña"><select className={field} value={type} onChange={e=>setType(e.target.value)}><option value="percent">Porcentaje del total</option><option value="fixed">Importe fijo</option></select></Field><Field label={type==='percent'?'Porcentaje de seña':'Importe de seña'}><input required type="number" min="0" max={type==='percent'?100:undefined} step="0.01" className={field} value={value} onChange={e=>setValue(e.target.value)}/></Field>{error&&<p role="alert" className="text-destructive">{error}</p>}<Button disabled={busy} className="h-12">{busy?'Guardando…':'Guardar configuración'}</Button></form></>;}
