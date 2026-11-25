# Protección de la configuración del negocio

## Lo que encontré
La tabla tiene una sola fila con: número de WhatsApp, tipo de seña, valor de seña, moneda y fechas de creación/modificación.

Quién la usa:
- **Catálogo y reserva públicos** (`getCatalog`): leen solo WhatsApp, tipo y valor de seña, para calcular el presupuesto y armar el mensaje. Hoy usan la regla pública abierta.
- **Envío de la solicitud** (`createReservation`): lee en el servidor con permisos privados; no depende de la regla pública.
- **Panel → Configuración**: lee y guarda solo como administrador (ya protegido por permiso de administrador en el servidor y en la base).

Reglas actuales: lectura pública de todo (`USING (true)`), edición solo administradores, sin altas ni borrados. Los cambios quedan en el historial administrativo.

Ningún dato es secreto hoy (el WhatsApp y la seña se muestran en el sitio), pero las fechas internas y cualquier columna futura quedarían expuestas automáticamente.

## Cambios que propongo
1. Crear una vista pública `public_business_settings` con **solo** WhatsApp, tipo de seña, valor de seña y moneda.
2. Quitar la regla «Public can view business settings» y el permiso de lectura para visitantes sobre la tabla original.
3. Agregar lectura de la tabla original solo para administradores.
4. Mantener la edición solo para administradores (sin cambios) y seguir sin permitir altas ni borrados.
5. Cambiar el catálogo público para leer de la vista en lugar de la tabla.

No se borran columnas, filas ni funciones. El panel, el envío de reservas y el historial siguen igual.

## Verificación
- Visitante: la vista responde con los 4 campos; la tabla original rechaza la lectura.
- Catálogo y presupuesto con seña siguen mostrándose; el enlace de WhatsApp sigue apuntando al número actual.
- Pruebas automáticas existentes.
- No puedo probar con sesión real de administrador desde acá; lo verifico por las reglas de la base.

## Detalle técnico
- Vista con `security_invoker = false` (propiedad del dueño), `GRANT SELECT` a `anon, authenticated`; tabla: `REVOKE SELECT ... FROM anon`, nueva política `SELECT TO authenticated USING (has_role(auth.uid(),'admin'))`.
- `getCatalog` pasa a `sb.from('public_business_settings')`.
