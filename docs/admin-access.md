# Panel privado de Del Valle Rent a Car

## Funcionalidades desarrolladas

- `/admin`: resumen con indicadores reales, últimas solicitudes y próximas entregas/devoluciones.
- Solicitudes: filtros, datos completos, WhatsApp y cambios de estado con confirmación previa.
- Calendario mensual por vehículo: reservas confirmadas y bloqueos manuales editables y eliminables con confirmación.
- Vehículos: edición de información, precio, características, activación e imágenes privadas.
- Configuración: WhatsApp comercial y seña porcentual o fija, sobre los ajustes existentes.
- Consulta pública de disponibilidad al elegir fechas y antes de enviar la solicitud; las pendientes no ocupan fechas.
- Acceso con Supabase Auth y permiso administrativo comprobado en el servidor; no hay registro público de administradores ni perfiles adicionales.

## Datos y seguridad

Se reutilizan `vehicles`, `business_settings`, `customers`, `reservations` y `reservation_counters`. Las nuevas tablas son `user_roles`, `vehicle_blocks` y `admin_audit_log`, con permisos explícitos y RLS. Las migraciones registran las políticas, controles y autorización del primer propietario. Los conflictos se comprueban mediante disparadores transaccionales con bloqueo por vehículo y períodos semiabiertos: una devolución puede coincidir con la siguiente entrega. Las imágenes nuevas se guardan en el contenedor privado `vehicle-images` y se muestran mediante enlaces temporales. Quitar una referencia no borra el archivo almacenado.

No se eliminaron vehículos, clientes ni reservas existentes; siguen siendo cinco vehículos, tres clientes y tres solicitudes. No se modificaron las tarifas ni la seña por esta implementación. Las solicitudes siguen coordinándose por WhatsApp, sin pagos en línea, extras ni cargos por ubicación.

## Acceso de los propietarios

La invitación del primer propietario fue enviada al correo indicado y su cuenta tiene el permiso `admin`. Debe abrir el correo, establecer su propia contraseña e iniciar sesión en `/auth` para acceder a `/admin`. La contraseña no se genera ni se comparte desde el proyecto.

Para el segundo propietario falta su correo electrónico. Se debe invitar ese correo en Supabase Authentication y añadir únicamente su identificador de cuenta a `public.user_roles` con rol `admin`. No habilitar un formulario público para conceder permisos.

En Supabase Authentication → URL Configuration, comprobar que Redirect URLs incluya:

- `https://id-preview--1dd31876-cbb4-4c6c-af8c-11b7afb7afa3.lovable.app/reset-password`
- `https://del-valle-road-adventures.lovable.app/reset-password` cuando se publique.

La lista de redirecciones, entrega efectiva del correo y protección de contraseñas filtradas no se pudieron verificar mediante las herramientas de configuración disponibles. Un correo aceptado para envío no confirma su entrega. Si la invitación abre otra página, primero corregir la lista de redirecciones y solicitar un nuevo enlace mediante «Olvidé mi contraseña».

## Pruebas y límites de verificación

- Diecinueve pruebas automáticas aprobadas: cálculos existentes, rutas públicas, reglas de estados, seña y límites de disponibilidad.
- Comprobaciones SQL aisladas aprobadas: solapamiento al crear y editar bloqueos, períodos contiguos y bloqueo de escrituras no autorizadas. Todos los datos temporales se revirtieron en la misma transacción.
- Navegador: las cinco páginas privadas redirigen al acceso sin sesión; recuperación y enlace inválido tienen estados claros; el catálogo devuelve cinco vehículos y mantiene el paso siguiente del flujo público.
- Acceso verificado visualmente en computadora y celular; sin desbordamiento horizontal ni errores de ejecución en las pantallas públicas comprobadas.
- Compilación automática verificada sin errores.

La conexión es Supabase externa: no está disponible una sesión de propietario para pruebas autenticadas desde este entorno. Por tanto, quedan sin verificación de punta a punta el inicio de sesión real, establecimiento de contraseña desde el correo, acciones del panel y carga de fotos. Tampoco se ejecutó una prueba simultánea con dos propietarios; se implementó la protección transaccional y se probaron los conflictos secuenciales en SQL. No se envió una solicitud de reserva ficticia ni se cambió el estado de las existentes para simular operaciones.

Las comprobaciones de Supabase reportaron avisos previos sobre funciones privilegiadas ejecutables, una tabla con RLS sin políticas y protección de contraseñas filtradas deshabilitada. No se ajustaron automáticamente políticas ajenas a esta tarea; esos avisos requieren una revisión separada, con su alcance real.