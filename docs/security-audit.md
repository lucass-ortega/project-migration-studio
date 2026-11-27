# Auditoría y correcciones de seguridad — Del Valle Rent a Car

## Resultado y alcance
Se inspeccionaron código, migraciones, tablas, permisos efectivos, RLS, funciones SQL, autenticación y Storage. Se aplicaron correcciones sin rediseñar ni borrar registros existentes. **No se declara el proyecto completamente preparado para producción:** quedan configuraciones externas, comprobaciones con sesión real y concurrencia simultánea pendientes.

## 1. Problemas encontrados
- Permisos SQL excesivos de `TRUNCATE`, `REFERENCES`, `TRIGGER` y otros permisos sobre tablas públicas para roles del navegador; RLS no sustituye su revocación.
- La solicitud pública podía sobrescribir los datos de un cliente existente usando DNI y email sin comprobar identidad. El análisis profundo confirmó este hallazgo.
- La creación de cliente, numeración y reserva no era atómica. Reintentos podían devolver una cotización recalculada en vez del importe histórico y crear registros auxiliares innecesarios.
- Disponibilidad devolvía los extremos completos de períodos solapados, fuera de la ventana pedida; rangos SQL inválidos devolvían vacío en vez de error.
- Fechas inexistentes podían normalizarse automáticamente en JavaScript.
- Numeración con `lpad(...,4,...)` podía truncar números mayores a 9999.
- Función de activación automática de RLS con ejecución heredada de PUBLIC.
- Dependencias con vulnerabilidades conocidas: Zod, Seroval, js-yaml y source-map-js.
- Diferencias de URLs firmadas entre la primera representación y el navegador causaban un aviso de hidratación.

## 2. Problemas corregidos
- Revocación de permisos innecesarios de PUBLIC, anon y authenticated; concesiones específicas por operación y columna.
- Administradores solo pueden cambiar `status` de reservas; precios, fechas y demás datos históricos tienen protección adicional por trigger.
- Nueva operación SQL transaccional `submit_reservation_request`: exclusiva de service_role, bloqueo por clave de idempotencia, huella del contenido, precios calculados desde datos del vehículo, registro de cliente independiente y devolución de cotización guardada.
- Solicitudes iniciales siempre pendientes; vehículos inactivos y fechas inválidas rechazados.
- Disponibilidad con tres campos exclusivamente, extremos acotados al rango, validación de parámetros y máximo 730 días. Continúa mediante función del servidor; la RPC no quedó abierta a roles del navegador, evitando nuevas alertas sobre funciones privilegiadas públicas y conservando la arquitectura acordada.
- Numeración conserva todos los dígitos.
- Revocación de ejecución pública de funciones internas y de generación de números.
- Bloqueos nuevos deben identificar al administrador autenticado como creador.
- Restricción de nombres de archivos subidos a vehículo/UUID.extensión y firma pública solo de rutas del vehículo activo leído del catálogo.
- Actualización de dependencias y transferencia del caché público de catálogo al navegador. Nunca se transfieren consultas administrativas ni mutaciones.
- Corrección de dos avisos de reglas de Hooks en /auth y /login.

## 3. Archivos modificados o añadidos
- `src/lib/reservations.functions.ts`
- `src/lib/reservation-input.ts` (nuevo)
- `src/lib/supabase-public.server.ts` (nuevo)
- `src/lib/reservation-logic.ts`
- `src/lib/vehicle-images.server.ts`
- `src/lib/security-rules.test.ts` (nuevo)
- `src/test/sql/security-hardening.sql` (nuevo)
- `src/router.tsx`
- `src/routes/auth.tsx`, `src/routes/login.tsx`
- `package.json`, `bun.lock`
- `.env.example` (sin valores privados)
- `AGENTS.md`, `roadmap.md`
- Tipos de Supabase regenerados automáticamente por las migraciones.

## 4. Migraciones aplicadas
Todas las siguientes fueron ejecutadas, no solamente preparadas:
- `20261126161206_0405275f-7294-4293-8a26-5ebaacbe3dec.sql`: mínimo privilegio, RPC atómica, protección histórica, validación y Storage.
- `20261126161622_0eda5bd3-7023-4943-89f4-369841378e50.sql`: mantiene disponibilidad RPC exclusiva del servidor.
- `20261127051123_bdf517ef-2a53-4f6f-b4d4-abbec9f781b9.sql`: pruebas existentes aisladas de bloqueos.
- `20261127053557_38245501-3a17-40ec-8bb6-f57fc8b0e986.sql`: cotización nula y políticas específicas de bloqueos.
- `20261127055240_7bbad84e-bcb6-48d3-8586-9c8784f2b748.sql`: pruebas integrales aisladas.
- `20261127203505_d66407ef-386c-416c-ac8e-fe0072aa6b3d.sql`: evaluación eficiente de autorización en políticas de bloqueos.
Una primera ejecución de la prueba integral falló por una referencia SQL ambigua; se corrigió y la repetición pasó. No dejó filas de prueba.

## 5. Políticas RLS revisadas
RLS habilitado en vehicles, reservations, customers, vehicle_blocks, business_settings, user_roles, admin_audit_log y reservation_counters.
- Anónimos: solo vehículos activos y cuatro campos públicos de configuración; sin acceso a clientes, reservas, roles, auditoría o escritura.
- Autenticados sin rol: sin datos privados ni operaciones administrativas; pueden leer su propia autorización y catálogo activo.
- Administradores: lecturas necesarias y escrituras limitadas; no asignación de roles, borrado de clientes/reservas, edición de importes históricos ni modificación de auditoría.
- `public_business_settings` permanece intacta: cuatro columnas exactas (`whatsapp_number`, `deposit_type`, `deposit_value`, `currency`), id=1, `security_barrier=true`, `security_invoker=false`, propietario postgres con lectura de la tabla. Solo lectura para los roles públicos; tabla original sin lectura para anon/PUBLIC. El aviso del linter sobre vistas con permisos del propietario sigue visible: es un mecanismo deliberado y acotado, no una exposición de columnas adicionales.
- reservation_counters sin políticas: bloqueo deliberado de acceso del navegador; solo la operación privilegiada de numeración lo usa. El aviso informativo sigue visible.
- Storage: bucket privado, tipos JPEG/PNG/WebP y máximo 5 MB ya configurados; lecturas y subidas administrativas. Sin escritura, borrado o listado público. URLs de catálogo firmadas por 1 hora.

## 6. Funciones SQL revisadas
Se inspeccionaron definiciones, propietarios y permisos de `set_updated_at`, `rls_auto_enable`, `has_role`, `enforce_vehicle_period`, `record_admin_action`, `next_reservation_number`, `public_occupied_periods` y las nuevas `protect_reservation_history`, `validate_business_settings`, `submit_reservation_request`.
Propietario actual: postgres. Search paths explícitos; nuevas funciones usan pg_catalog/public. `has_role` sigue invoker, consulta la tabla protegida y es ejecutable por authenticated para validar autorización real. Funciones trigger internas sin ejecución de navegador. Se conservan locks por vehículo y períodos semiabiertos del control de conflictos; auditoría sin datos personales adicionales.

## 7. Pruebas y resultados
- **29 pruebas automatizadas pasaron** en cuatro archivos, incluyendo 10 nuevas de seguridad.
- Pruebas SQL existentes de bloqueos: pasaron; fixture revertido.
- Pruebas SQL integrales: pasaron con roles SQL efectivos anon/authenticated y UUID de administrador existente, dentro de subtransacciones revertidas. Incluyen lecturas privadas denegadas, vehículo inactivo oculto, escritura anónima denegada, retiro temporal de rol y recuperación, lectura administrativa, cambios de estado, conflictos reserva/reserva y reserva/bloqueo, creación/borrado de bloqueos, cancelación y finalización, importes históricos, auditoría, idempotencia idéntica, reintento modificado rechazado y cliente previo intacto. No equivalen a iniciar sesión en el navegador.
- Conteos tras las pruebas: 3 reservas, 3 clientes, 5 vehículos, 0 bloqueos, 2 roles; fixtures integrales revertidos.
- Dependencias: **sin vulnerabilidades conocidas** en 53 dependencias de producción tras actualización.
- Verificación automática de TypeScript y compilación: último registro `build OK`. No se ejecutó manualmente otra compilación de producción ni TypeScript independiente: la plataforma realiza esos controles automáticamente.
- ESLint completo: **no aprobado**, 1006 errores de formato y 10 advertencias. No se reformateó todo el proyecto por el alcance de conservación. Reglas sin comprobación de formato: **0 errores**, 10 advertencias de exportación para recarga de componentes. `.oj-cache` se excluyó del recorrido diagnóstico, sin cambiar la configuración del proyecto.
- Navegador: todas las páginas públicas consultadas respondieron 200; /admin y cuatro subpáginas redirigen a /login sin sesión. Recuperación visible. Cinco fotos del catálogo cargaron; catálogo final **0 errores de consola** tras corregir hidratación.
- Se inspeccionaron metadatos propios de todas las páginas de contenido.
- WhatsApp: pruebas existentes de generación y enlace codificado pasaron. **No se envió una reserva real desde el navegador ni un mensaje de prueba.**

## 8. Variables y configuración externa
No faltaron claves del servidor durante las comprobaciones. `.env.example` documenta los nombres con valores vacíos. La clave privada sigue exclusivamente en el almacenamiento seguro y en código del servidor.
- Activar protección de contraseñas filtradas en Supabase Authentication: la integración externa no permite modificar esa opción desde las herramientas disponibles.
- Verificar en Supabase que registro público permanezca desactivado y las URLs exactas de recuperación estén permitidas: configuración alojada no leída en esta auditoría; no se habilitó registro ni se crearon cuentas.
- `.gitignore` es administrado por la plataforma; su edición fue rechazada y no se intentó eludir la restricción. `.env` de configuración pública debe permanecer versionado para alojamiento. No colocar credenciales privadas allí; revisar la exclusión de archivos privados desde la configuración permitida del proyecto.

## 9. Credenciales que requieren rotación
La búsqueda del historial accesible revisó 193 blobs y no encontró claves privadas Supabase, JWT service_role ni patrones de credenciales de proveedor. No se identificó una credencial concreta que requiera rotación. Esto no prueba la ausencia de secretos de formatos desconocidos, ramas no accesibles u otros sistemas externos. No se reprodujeron valores de credenciales.

## 10. Pendientes y límites
- Sesiones reales de administrador y usuario sin rol no disponibles: la herramienta de sesión fue rechazada por ser Supabase externo. Pendientes login autorizado, redirección de sesión activa, logout, cambios privados de punta a punta y subidas de fotos con sesión real.
- No se ejecutó una carrera real de dos conexiones simultáneas: locks inspeccionados y conflictos transaccionales probados, pero concurrencia simultánea no certificada.
- Flujo público completo con envío real e idempotencia HTTP simultánea pendiente; SQL atómico sí probado.
- Corrección global de formato ESLint pendiente; requiere una pasada de formato amplia sin cambios funcionales.
- Publicación y validación en el alojamiento real pendientes.
- Conservados avisos deliberados de vista pública y contador cerrado; protección de contraseñas filtradas requiere acción externa.

**Conclusión:** riesgos concretos corregidos y pruebas de permisos/integridad aprobadas; no corresponde afirmar todavía cumplimiento total del criterio de producción.
