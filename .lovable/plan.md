# Panel privado de Del Valle Rent a Car

## Punto de partida verificado

- El proyecto utiliza el Supabase externo conectado, sin activar Lovable Cloud.
- Existen las cinco tablas del sistema de reservas, cinco vehículos, tres clientes y tres solicitudes pendientes. Se conservarán todos los registros.
- El catálogo y la solicitud por WhatsApp ya funcionan sobre esas tablas. Actualmente no hay cuentas administrativas autorizadas, calendario, bloqueos ni funciones de confirmación.
- El sitio público mantiene su diseño actual; la sección de categorías eliminada no se restaurará.

## 1. Acceso privado

- Crear inicio de sesión con correo y contraseña mediante Supabase Auth, sin registro público desde el panel.
- Autorizar exclusivamente cuentas elegidas por los propietarios mediante permisos almacenados en una tabla separada; una cuenta autenticada sin autorización no podrá entrar ni consultar datos administrativos.
- Mostrar el correo conectado y permitir cerrar sesión, eliminando los datos privados de la sesión anterior.
- Incluir recuperación de contraseña y aceptación segura del acceso invitado.
- Por defecto, usar el correo como identificación, sin perfiles adicionales. Adaptar esta parte si la respuesta a la pregunta abierta indica que necesitan nombre u otros datos.
- No crear cuentas, inventar correos ni enviar invitaciones sin los datos reales de los propietarios.

## 2. Panel y resumen

- Crear `/admin` con navegación lateral: Resumen, Solicitudes y reservas, Calendario de disponibilidad, Vehículos y Configuración.
- Mantener azul, blanco y amarillo, con textos en español, controles claros y adaptación a celular, tablet y computadora.
- Mostrar indicadores reales: solicitudes pendientes, reservas confirmadas, vehículos habilitados disponibles ahora, vehículos ocupados, próximas entregas y devoluciones.
- Presentar últimas solicitudes y próximas reservas; mostrar estados vacíos reales cuando no haya registros.

## 3. Solicitudes y reservas

- Listado con filtros por estado, vehículo, fecha y cliente o número; incluir paginación para no omitir registros al crecer el negocio.
- Detalle con todos los datos guardados, ubicaciones, referencias, observaciones, importes históricos y fecha de creación.
- Acceso a WhatsApp del cliente y acciones para confirmar, rechazar, cancelar y finalizar, con confirmación antes de acciones sensibles.
- Mantener los cinco estados existentes. Las pendientes, rechazadas, canceladas y finalizadas no bloquearán nuevas operaciones; las confirmadas sí.
- Registrar quién realizó los cambios importantes y cuándo. Las acciones no modificarán los precios históricos de las solicitudes.

## 4. Calendario y bloqueos

- Calendario mensual por vehículo, con períodos disponibles y ocupados, navegación entre meses y detalle de reservas o bloqueos al seleccionar un día.
- Crear, editar y eliminar bloqueos manuales con vehículo, inicio, fin y motivo; pedir confirmación al eliminar.
- Antes de confirmar o guardar un bloqueo, comprobar conflictos en la base de datos y devolver el número de reserva o motivo del bloqueo y las fechas involucradas.
- Permitir que una devolución y una nueva entrega coincidan exactamente: los períodos se consideran desde el inicio incluido hasta el fin excluido.
- Serializar las operaciones por vehículo dentro de una transacción para impedir que dos administradores confirmen períodos superpuestos simultáneamente.

## 5. Vehículos y configuración

- Mostrar también vehículos desactivados; editar datos, tarifa diaria, características, fotografías y habilitación.
- Subir fotografías mediante Supabase Storage con permisos exclusivos de administración, límites de archivo y validación de formato.
- No incluir eliminación de vehículos: se preservarán los registros vinculados a reservas históricas.
- Editar el WhatsApp comercial y la seña porcentual o fija en `business_settings`, sin cambiar sus valores iniciales ni la fórmula comercial acordada.
- Validar los cambios antes de guardarlos y mostrar mensajes claros de éxito o error.

## 6. Integración pública mínima

- Agregar consulta de disponibilidad para las fechas elegidas y una verificación antes de enviar la solicitud, sin cambiar los pasos ni el mensaje de WhatsApp.
- Considerar únicamente reservas confirmadas y bloqueos manuales; las solicitudes pendientes seguirán sin bloquear.
- No exponer nombres, contactos, números de solicitud ni motivos privados de los bloqueos al público: la consulta pública devolverá solo disponibilidad o períodos ocupados.
- Mantener la confirmación definitiva a cargo de los propietarios y guardar la solicitud antes de abrir WhatsApp.
- No incorporar pagos, extras ni cargos por ubicación. Las correcciones ajenas a este panel detectadas en la auditoría anterior quedan fuera de este trabajo.

## Detalles técnicos

- Reutilizar TanStack Start, los componentes y tokens existentes y los clientes generados de Supabase.
- Añadir tablas de permisos administrativos, bloqueos manuales y registro de acciones mediante migraciones, con concesiones explícitas y RLS. No duplicar clientes ni reservas.
- Proteger las páginas mediante el esquema de rutas autenticadas y comprobar el permiso administrativo en cada función de servidor; no confiar en información editable del navegador.
- Las funciones administrativas utilizarán el cliente autenticado y las políticas correspondientes. Las operaciones de disponibilidad se centralizarán en funciones SQL restringidas que comprueben permisos y ejecuten cambios atómicos.
- Impedir escrituras directas de estados y bloqueos que puedan saltarse la comprobación de conflictos. Aplicar el mismo bloqueo transaccional al crear, editar, liberar o confirmar períodos.
- Añadir el envío del token de sesión conservando la protección actual contra solicitudes cruzadas y los demás controles existentes.
- Regenerar los tipos de Supabase mediante las herramientas de integración, sin editar manualmente archivos generados.
- Registrar decisiones estructurales en `AGENTS.md` y mantener una lista de tareas durante la implementación.

## Pruebas y entrega

- Ejecutar las pruebas actuales y añadir pruebas de permisos, estados que bloquean, coincidencia de horarios, edición de bloqueos y superposición entre reservas y bloqueos.
- Verificar concurrencia con dos operaciones simultáneas dentro de un entorno de prueba con transacciones revertidas, sin alterar reservas existentes ni mostrar datos ficticios en el panel.
- Comprobar cierre de sesión, acceso denegado, filtros, detalles, calendario, cambios de vehículo y configuración y disponibilidad pública.
- Probar las pantallas en computadora y celular y contrastar los cambios guardados con lo que aparece después en el panel.
- El proyecto usa Supabase externo: no hay una sesión de administrador disponible para pruebas automáticas. La verificación completa autenticada dependerá de una cuenta autorizada y una sesión de prueba disponibles; no se solicitarán contraseñas por chat.
- Entregar el resumen de funciones, migraciones, pruebas realizadas, límites de verificación y pasos para autorizar a los dos propietarios.

## Acceso de los propietarios

Se necesitarán sus correos reales para invitarlos desde Supabase Auth y asignarles el permiso administrativo. También se comprobará la configuración de acceso por correo y las direcciones de retorno para invitación y recuperación de contraseña. No se habilitará registro público de administradores ni se otorgarán permisos automáticamente a cualquier cuenta.