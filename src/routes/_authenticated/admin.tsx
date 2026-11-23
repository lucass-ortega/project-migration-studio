import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { AdminShell } from '@/components/admin/shell';
import { adminHead } from '@/lib/admin/rules';
export const Route=createFileRoute('/_authenticated/admin')({head:()=>adminHead('Panel privado'),component:AdminShell,pendingComponent:()=> <main className="grid min-h-dvh place-items-center bg-background text-primary" role="status">Cargando panel…</main>,errorComponent:({reset})=><main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center"><h1 className="text-2xl font-bold text-primary">No se pudo abrir el panel</h1><p className="text-muted-foreground">Comprobá tu conexión y que tu cuenta esté autorizada.</p><div className="flex flex-wrap justify-center gap-3"><Button onClick={reset}>Intentar nuevamente</Button><Button variant="outline" asChild><Link to="/auth">Volver al acceso</Link></Button></div></main>});
