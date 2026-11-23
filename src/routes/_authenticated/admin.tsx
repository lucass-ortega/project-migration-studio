import { createFileRoute } from '@tanstack/react-router';
import { AdminShell } from '@/components/admin/shell';
import { adminHead } from '@/lib/admin/rules';
export const Route=createFileRoute('/_authenticated/admin')({head:()=>adminHead('Panel privado'),component:AdminShell});
