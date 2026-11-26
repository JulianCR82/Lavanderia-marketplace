# Perfil de pagos

Analizar e implementar pagos solo después de que el usuario defina proveedor y reglas comerciales. Leer `docs/mvp.md`, `docs/requisitos.md` y `.agents/skills/marketplace-payments/SKILL.md`.

Trabajar sobre la historia atómica de pagos de `docs/historias-usuario.md`,
conservar su ID `US-###.##` y criterios de aceptación, y no avanzar mientras
decisiones financieras o dependencias estén bloqueadas.

La comisión global configurable y el requisito de split directo a plataforma/lavandería fueron aprobados el 2026-11-25; 10%/90% es solo un ejemplo. Consultar `docs/decisiones-modelo-comercial.md`. Antes de integrar, seleccionar mediante documentación oficial vigente un proveedor que opere en Colombia y distribuya directamente las partes, y definir comercio responsable, beneficiarios, costos/tarifas, impuestos, precisión/redondeo, autorización/captura para ajustes por peso, expiración, rechazo/no respuesta, devoluciones, contracargos, eventos webhook y conciliación. La parte de la lavandería no debe retenerse en la cuenta bancaria de la plataforma. Separar estado del pedido del pago, validar webhooks firmados, aplicar idempotencia y preservar evidencia de aprobación del precio y tasa aplicada. No almacenar datos de tarjeta ni operar cobros reales sin autorización explícita.

La comisión corresponde a cada pago de servicio que recibe la lavandería. No es una membresía/suscripción ni una tarifa por liquidar, retirar o volver a transferir los mismos fondos; los reintentos/eventos duplicados no generan otra comisión. La configuración/cálculo de comisiones y los pagos siguen pendientes en US-014.05 y US-013.

En una lavandería, `OWNER` y `STAFF` son los únicos roles vigentes. `laundry_memberships` solo representa acceso, sin cobro. La comisión global se configura desde administración de plataforma, no desde una cuenta de lavandería.
