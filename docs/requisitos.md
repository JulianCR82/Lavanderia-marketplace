# Requisitos y reglas de negocio del MVP

Este documento traduce el alcance acordado en reglas para guiar la implementación. Las decisiones abiertas se mantienen señaladas; las recomendaciones no amplían el alcance por defecto. Consultar `docs/mvp.md` para contexto, tecnologías y pendientes.

El trabajo funcional sigue las historias identificadas y ordenadas en `docs/historias-usuario.md`; cada historia conserva trazabilidad a estos requisitos y reglas.

## Requisitos funcionales

- **RF-01 — Comparar oferta:** el cliente puede consultar lavanderías y comparar sus servicios, precios, unidades, condiciones y modalidades disponibles.
- **RF-02 — Catálogo independiente:** cada lavandería crea, edita, activa y desactiva servicios propios con descripción, unidad de cobro, precio y condiciones. Debe admitir lavado por kilogramo, cobijas/edredones, cortinas, prendas individuales y otros servicios configurados por el establecimiento.
- **RF-03 — Solicitar pedido:** el cliente selecciona una lavandería y sus servicios, cantidad o estimación requerida, modalidad de atención y datos necesarios para completar la solicitud.
- **RF-04 — Precio fijo:** antes de confirmar una solicitud de precio fijo, se informa al cliente el importe aplicable.
- **RF-05 — Precio por peso:** el cliente aporta peso estimado o cantidad aproximada. La lavandería registra el peso definitivo al recibir y pesar las prendas y actualiza el importe. El cliente ve y aprueba cualquier diferencia antes del cobro definitivo.
- **RF-06 — Disponibilidad y programación:** cada lavandería define horarios y disponibilidad. Se admiten pedidos programados; los pedidos inmediatos solo pueden solicitarse cuando existe disponibilidad.
- **RF-07 — Entrega en establecimiento:** el cliente lleva los artículos y luego los recoge en el establecimiento.
- **RF-08 — Recogida y devolución a domicilio:** la lavandería puede habilitar el servicio y configurar zonas, tarifas y condiciones; se encarga de la logística de ambos trayectos.
- **RF-09 - Gestión de lavandería:** desde la app móvil, usuarios autorizados de una lavandería administran su catálogo y sus pedidos. La cuenta de trabajo que registra directamente un establecimiento queda asociada automáticamente como `OWNER`; el alta no depende de una invitación o asociación previa por el administrador. Los únicos roles de membresía son `OWNER` y `STAFF`; el propietario invita cuentas individuales de trabajo como staff. Decisión vigente 2026-11-25: aceptar una invitación STAFF convierte la misma cuenta de cliente en trabajo exclusivo, conservando correo/credencial/datos y retirando capacidades de cliente; se revocan sus sesiones anteriores. Sustituye la propuesta de cuentas y correos separados; ver [modelo comercial](decisiones-modelo-comercial.md).
- **RF-10 — Gestión de plataforma:** un panel web permite al administrador supervisar lavanderías, clientes, pedidos, pagos e incidencias.
- **RF-11 - Pago dividido en plataforma:** el proveedor debe distribuir cada venta entre la lavandería y la plataforma mediante split de pagos o capacidad equivalente; el dinero de la lavandería no debe retenerse en la cuenta bancaria de la plataforma. El backend calcula los montos y confirma el resultado desde notificaciones verificadas del proveedor. La selección de proveedor, moneda, costos y reglas de ajustes/devoluciones sigue pendiente. Ver [decisiones del modelo comercial](decisiones-modelo-comercial.md).
- **RF-12 - Multitenencia:** el sistema admite múltiples lavanderías independientes desde el inicio, aunque inicialmente opere una sola.
- **RF-13 - Comisión configurable:** el administrador de plataforma puede configurar una única tasa global aplicable a todas las lavanderías. La tasa vigente determina el porcentaje de la plataforma y el remanente de la lavandería; el 10%/90% es solo un ejemplo, no una tasa fija aprobada. Cada transacción conserva la tasa e importes aplicados y los cambios quedan auditados.

## Requisitos no funcionales

- **RNF-01 - Aislamiento:** cada lavandería solo accede a su catálogo, pedidos y operación; el backend verifica identidad, rol (`OWNER`/`STAFF`) y pertenencia en cada acción. El cliente solo accede a sus propios pedidos. El administrador de plataforma opera según facultades explícitas y es distinto de ambos roles de lavandería.
- **RNF-02 — Backend común:** la app móvil y el panel web comparten API y reglas de negocio; el cliente no es autoridad para permisos, precios finales ni disponibilidad.
- **RNF-03 — Integridad:** mantener consistencia entre pedido, importe aprobado y transacciones de pago; soportar reintentos sin duplicar operaciones financieras.
- **RNF-04 — Trazabilidad:** conservar autor y momento de cambios relevantes de precio, peso, aprobación, estado y pago para atención de incidencias.
- **RNF-05 — Compatibilidad:** experiencia de cliente y lavandería en aplicación móvil Android/iOS; panel independiente accesible en web.
- **RNF-06 — Privacidad y secretos:** solicitar solo datos personales necesarios, proteger credenciales, y no incluir secretos en aplicación cliente, respuestas o logs.
- **RNF-07 — Mantenibilidad:** NestJS modular, tipos compartidos donde convenga y migraciones de base de datos versionadas; no introducir microservicios sin una necesidad demostrada.
- **RNF-08 — Ubicación:** presentar valores en moneda y fechas con convenciones acordadas para Bogotá/Colombia. La moneda e impuestos aplicables quedan por confirmar.

## Reglas de negocio

- **RN-01 — Propiedad del catálogo:** todo servicio pertenece a una lavandería; sus precios y condiciones son independientes de otras lavanderías.
- **RN-02 — Visibilidad del servicio:** solo servicios activos se ofrecen para pedidos nuevos. Desactivar un servicio no altera pedidos ya confirmados.
- **RN-03 — Snapshot del pedido:** guardar en el pedido nombre/identificación del servicio, unidad, precio o base de cálculo, condiciones y modalidad aceptados; cambios posteriores del catálogo no reescriben pedidos existentes.
- **RN-04 — Importe por peso:** el estimado no es el total definitivo. El importe definitivo se calcula con el peso medido y las condiciones vigentes aceptadas. Si difiere del estimado, pedir aprobación explícita del cliente antes de cobrar la diferencia o iniciar el cobro definitivo.
- **RN-05 — Precio fijo:** mostrar el importe aplicable antes de confirmar. Cualquier cargo posterior requiere regla y aceptación informada.
- **RN-06 — Disponibilidad:** confirmar o aceptar un pedido inmediato requiere disponibilidad de la lavandería; horarios configurados por sí solos no prueban capacidad. El método para controlar capacidad y concurrencia está pendiente.
- **RN-07 — Modalidad de atención:** establecimiento y domicilio son modalidades separadas. Domicilio requiere oferta habilitada, dirección dentro de cobertura y aceptación de tarifa/condiciones. La lavandería es responsable de recogida y devolución.
- **RN-08 - Aislamiento por lavandería:** una membresía `OWNER` o `STAFF` de una lavandería no concede acceso a otra. Identificadores enviados por el cliente no sustituyen validación del backend. Solo se asigna `OWNER` al registrar la lavandería; la invitación de personal asigna `STAFF`.
- **RN-09 — Estados separados:** el ciclo del pedido y el del pago son independientes; un pedido no se marca pagado solo porque el cliente regresó de una pantalla de pago. Verificar confirmación con el proveedor.
- **RN-10 — Idempotencia:** reintentos de una solicitud o confirmación de pago no deben crear pedidos ni cobros duplicados.
- **RN-11 - Sin red propia:** la primera versión no desarrolla repartidores propios ni asigna conductores; la logística de domicilio la gestiona cada lavandería.
- **RN-12 - Liquidación directa y trazable:** cada venta se distribuye por el proveedor entre la lavandería y la plataforma; el marketplace no custodia ni transfiere manualmente a la lavandería su porción de la venta. Los importes, la tasa global y las referencias de liquidación se calculan y verifican del lado servidor.

## Autenticación aprobada — 2026-11-22

Para US-001 rigen las [decisiones oficiales de autenticación](decisiones-autenticacion.md):
API propia, correo/contraseña con OTP, Google en Android/iOS (Apple diferido por decisión del usuario),
Argon2id, Resend, políticas de contraseña/antiabuso y sesiones opacas de 7 días. La experiencia
final incluye ingreso automático al integrar US-001.02. Los criterios verificables
están en `docs/historias-usuario.md`; no se consideran implementados por aprobación.
Falta configurar proveedores y verificar entrega/acceso reales; recuperación conserva
los pendientes de su historia. La entrega actual usa 7 días absolutos sin renovación
deslizante. Semillas locales y configuración en [guía de acceso](configuracion-acceso-y-pruebas.md).

## Decisiones que bloquean detalles de implementación

- Proveedor de pagos y soporte real para autorización, captura, cobro adicional, reverso y devoluciones; autorización y distribución de fondos entre lavanderías. Afecta arquitectura financiera, estados, experiencia y riesgo de servicio no cobrado.
- Qué sucede si el cliente rechaza el nuevo precio, no responde o el pago falla; si se inicia el lavado antes de confirmar pago definitivo.
- Unidades, mínimos, precisión y redondeo de precios por peso; cálculo para artículos fijos y comparación de servicios equivalentes.
- Cómo se mide disponibilidad y se reserva capacidad ante solicitudes concurrentes; anticipación, franjas y reprogramación.
- Representación de zonas, tarifas y ventanas de domicilio; moneda, impuestos, cancelaciones, estados y notificaciones.
- Tecnología del panel web, roles detallados y ORM; concretar políticas específicas de recuperación y renovación de sesiones en sus historias. El registro y su autenticación ya están definidos. La estrategia SQL de migraciones ya existe en el repositorio.
