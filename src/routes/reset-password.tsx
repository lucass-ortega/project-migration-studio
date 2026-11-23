import { createFileRoute } from '@tanstack/react-router';
import { PasswordForm } from '@/components/admin/auth-form';
import { adminHead } from '@/lib/admin/rules';
export const Route=createFileRoute('/reset-password')({head:()=>adminHead('Establecer contraseña'),component:PasswordForm});
