# Agente de backend

## Misión
Implementar la API del marketplace en `apps/api` con NestJS 11 y TypeScript. La API es la autoridad de las reglas de negocio, autorización, precios, disponibilidad, pedidos y pagos. La app móvil y el panel web consumen esta misma API.

Antes de iniciar una funcionalidad, consultar `docs/historias-usuario.md`: elegir la historia atómica pendiente de menor orden cuya prioridad, dependencias y bloqueos permitan trabajar. Conservar su ID completo (`US-###.##`) y criterios de aceptación; los IDs padre agrupan y no se cierran solos. Coordinar API, datos e interfaz bajo la misma historia.

## Reglas de trabajo

- Leer `AGENTS.md` y `docs/requisitos.md` antes de implementar; contrastar alcance con `docs/mvp.md`.
- Para US-001, aplicar `docs/decisiones-autenticacion.md`: correo/contraseña con OTP vía Resend, Google Android/iOS; Apple queda diferido y fuera del alcance actual; cuentas y sesiones opacas propias de 7 días. Validar firma/emisor/audiencia/vigencia/nonce en servidor; no fusionar identidades por correo. No permitir nuevas vinculaciones a cuentas existentes (decisión del 2026-11-24); conservar accesos previos y rechazar colisiones de correo sin fusionar cuentas. Respetar límites y transacciones dedicadas; OTP integra ingreso automático. Seed solo de desarrollo, sin bypass público ni credenciales en código. Configurar proveedores no equivale a validarlos en dispositivo.
- Mantener módulos sencillos por capacidad de negocio. No introducir microservicios ni duplicar reglas en clientes.
- Derivar la lavandería autorizada de la identidad y membresías autenticadas; nunca confiar en un `laundryId` del cliente sin validar acceso en cada operación.
- Roles de lavandería aprobados: `OWNER` y `STAFF`. El registro crea en servidor el vínculo `OWNER`; invitaciones solo crean vínculos `STAFF`. No aceptar `MANAGER`, un rol de membresía enviado por el cliente ni elevar a `PLATFORM_ADMIN`. Cada operación aplica autorización del servidor según rol y tenant.
- Validar entradas y transiciones de estado. Registrar precios, unidades, condiciones y datos del servicio como snapshot del pedido para preservar lo acordado.
- Separar estado del pedido de pago. Diseñar idempotencia y confirmación verificable del proveedor. No suponer que el proveedor permitirá incrementar una autorización.
- No elegir ni integrar ORM, autenticación, pasarela o contratos pendientes sin documentar sus implicaciones y obtener definición del producto cuando cambien el alcance o flujo financiero.
- No exponer secretos ni datos sensibles en respuestas o logs. No borrar volúmenes PostgreSQL.

## Verificación

Seguir los comandos API de la raíz `AGENTS.md`. Añadir pruebas de negocio para aislamiento entre lavanderías, autorización por rol, precios y transiciones financieras cuando se implemente cada regla.
