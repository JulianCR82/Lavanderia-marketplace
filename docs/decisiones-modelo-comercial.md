# Decisiones del modelo comercial y de pagos

**Aprobadas por el usuario: 2026-11-25.** Aplican al marketplace de lavanderías. Definen el modelo de negocio, pero no seleccionan ni configuran una pasarela y no autorizan procesar dinero real.

## Conversión exclusiva de cliente a trabajo — Aprobado 2026-11-25

- El usuario sustituyó la decisión anterior de dos cuentas/correos: una cuenta de cliente puede convertirse en cuenta de trabajo al aceptar expresamente una invitación STAFF de un OWNER.
- Se conserva la misma identidad, correo y credencial. No se exige otra cuenta ni otro correo. Enviar una invitación no convierte ni concede acceso.
- La aceptación crea únicamente STAFF en la lavandería invitante. La cuenta pasa de account_kind CUSTOMER a LAUNDRY y pierde acceso a funciones de cliente; no hay cambio de perfil cliente/trabajo ni retorno automático al retirar membresías.
- Se conservan sus datos e historial; conversión, vínculo, consumo, auditoría, revocación de sesiones anteriores y emisión de una sesión de trabajo se confirman en una transacción. La UI informa el efecto y pide confirmación explícita.
- OWNER/STAFF siguen siendo roles por lavandería. El campo histórico platform_role conserva CUSTOMER/PLATFORM_ADMIN; account_kind es la clasificación funcional que las políticas de cliente deben comprobar, además del rol de plataforma.
- Las cuentas existentes con OWNER/STAFF ordinarios se clasifican como LAUNDRY mediante la migración 008, conservando identidad y credenciales y cerrando sesiones previas. Los administradores de plataforma mantienen su rol y no pueden aceptar invitaciones STAFF desde esa cuenta.

## Registro de lavanderías

- La lavandería puede iniciar su registro sin que el administrador de plataforma cree previamente el establecimiento o envíe una invitación.
- La cuenta que registra la lavandería queda asociada como `OWNER` y se clasifica como cuenta de trabajo exclusiva. El autorregistro OWNER sigue pendiente de US-002.01. No requiere una invitación o aprobación administrativa previa para establecer esa relación.
- La asociación cuenta-lavandería se conserva en el modelo interno de permisos para que la API pueda comprobar propietario, roles y aislamiento entre establecimientos. Por tanto, el alta no requiere una membresía preexistente, aunque el sistema crea la relación propietaria como parte del registro.
- La cuenta propietaria podrá invitar a otros miembros bajo las historias de EP-03. Los roles de esos miembros no conceden acceso a otras lavanderías.
- El estado operativo, la visibilidad pública y los requisitos de verificación comercial son asuntos separados del alta del propietario y deben precisarse antes de implementar sus flujos.

## Roles de cada lavandería

- Decisión ratificada por el usuario: 2026-11-25. Se simplifican los roles de lavandería a `OWNER` y `STAFF`.
- Los únicos roles vigentes de membresía son `OWNER` y `STAFF`. `CUSTOMER` y `PLATFORM_ADMIN` son roles de plataforma, no roles de lavandería.
- `OWNER` se asigna automáticamente a la cuenta que registra la lavandería. El propietario puede invitar cuentas como `STAFF`; una invitación no crea otra lavandería ni concede acceso a ningún otro establecimiento.
- `STAFF` usa su propia cuenta individual y recibe acceso solo a las lavanderías que le hayan invitado. No puede cambiar la tasa global de comisión ni elevarse a `OWNER` o `PLATFORM_ADMIN`.
- No se define una transferencia de propiedad en estas historias. No implementar ascensos a `OWNER` mediante la operación ordinaria de asignación de rol hasta que se acuerde ese flujo.
- El antiguo rol `MANAGER` queda retirado del modelo aprobado. La precisión de permisos por operación se concreta en las historias de catálogo, pedidos y administración; ambas membresías siguen sometidas a autorización del servidor.
- La migración inicial conserva el enum legado; `apps/api/migrations/007_laundry_membership_roles.sql` normaliza los registros `MANAGER` existentes a `STAFF` y elimina ese valor del enum vigente.

## Invitación de staff — Implementación de US-003.01

1. Una cuenta OWNER existente entra en Perfil → Equipo de mi lavandería, selecciona su lavandería e invita el correo de una cuenta individual. El servidor fija STAFF y valida la pertenencia OWNER; no hay selección libre de rol.
2. Resend envía una notificación para abrir la app e ir a Perfil → Invitaciones de trabajo. La invitación dura 48 horas desde su creación y solo aparece para el correo de la sesión autenticada. No contiene un token que sirva como sesión ni se acepta desde un enlace público.
3. Una persona sin cuenta completa el registro y verificación de correo existentes y entra con el correo invitado. Una persona con cuenta de cliente utiliza esa misma cuenta. No se comparte contraseña con el propietario.
4. La persona revisa la lavandería y confirma Aceptar y convertir mi cuenta en Staff. La API exige confirm:true, no permite elegir cuenta/lavandería/rol, revalida al propietario y rechaza invitaciones ajenas, vencidas, canceladas, ya consumidas o cuyo envío no se confirmó.
5. La transacción convierte a LAUNDRY, crea STAFF, consume la invitación, audita y reemplaza las sesiones. La cuenta pierde capacidades de cliente también en backend y conserva la clasificación de trabajo aunque más adelante no tenga membresías.
6. El OWNER consulta el historial paginado de invitaciones y puede cancelar las pendientes. Los fallos de envío admiten reintento después de un minuto, con la misma referencia de entrega y vigencia. Se comparten cuotas de correo con registro/recuperación y se limita a 20 invitaciones nuevas por lavandería en 24 horas, incluidas las canceladas.

Las cuentas de trabajo ya existentes pueden aceptar un vínculo STAFF adicional; cada lavandería conserva su aislamiento. No se degrada una membresía OWNER ni se otorga administración de plataforma. Revocar staff y administrar permisos de negocio siguen en US-003.02/.03 y sus historias respectivas; registrar nuevas lavanderías sigue en US-002.01. La implementación de invitaciones para los OWNER existentes se autorizó específicamente en esta conversación, sin dar por resuelta esa dependencia de alta.

Contrato, pruebas y aceptación funcional Android/API confirmada por el usuario: [invitaciones y conversión](us-003.01-invitaciones-staff.md). iOS permanece pendiente.

## Comisión de plataforma

- El marketplace obtiene ingresos mediante una comisión por cada pago de un servicio que recibe la lavandería. La transacción comisionable corresponde al pago del servicio del cliente, no a una transferencia bancaria ajena a ese servicio.
- La liquidación, el retiro o una transferencia posterior de esos mismos fondos no genera otra comisión de plataforma. Los reintentos técnicos y eventos duplicados del proveedor tampoco pueden duplicarla. Las reglas de ajustes, reembolsos y contracargos siguen pendientes de definición.
- Este modelo sustituye el cobro de una membresía o suscripción comercial a las lavanderías. Los vínculos internos de acceso (`laundry_memberships`) solo representan pertenencia y permisos; no son un producto de cobro.
- La tasa es global para todas las lavanderías y la puede configurar un administrador de plataforma desde el panel administrativo.
- **10% para la plataforma y 90% para la lavandería es un ejemplo, no una tasa fija aprobada.** El porcentaje vigente debe configurarse antes de procesar pagos reales.
- La tasa y los importes calculados deben quedar asociados al intento/transacción correspondiente. Un cambio administrativo debe auditar actor y fecha, y no modificar transacciones ya iniciadas.
- Antes de implementar se deben fijar precisión, redondeo, momento de aplicación y distribución de las tarifas del proveedor, impuestos, reembolsos y contracargos.
- La configuración/cálculo de comisión y la integración de pagos todavía no están implementadas; corresponden a US-014.05 y US-013. Esta decisión no habilita dinero real.

## Distribución del pago

- La futura pasarela debe ofrecer pagos divididos para marketplace o una capacidad equivalente que distribuya cada transacción directamente entre la lavandería y la plataforma.
- La parte de la lavandería no debe permanecer retenida en la cuenta bancaria de la plataforma ni entrar a una cuenta de la plataforma para ser transferida manualmente después.
- El backend debe calcular importe, comisión y destinatarios. El cliente no puede elegir ni alterar tasa, cuenta receptora o porcentajes.
- El proveedor debe admitir operación en Colombia y permitir verificar beneficiarios, liquidaciones, pagos divididos, reembolsos y contracargos. Su soporte para ajustes por peso también debe verificarse; no se presupone captura incremental.
- La selección del proveedor queda pendiente de evaluación de documentación oficial vigente, disponibilidad, requisitos de alta y costos. La decisión de split no equivale a haber elegido un proveedor.

## Pendientes antes de operar dinero real

- Seleccionar y validar el proveedor, países, moneda, métodos de pago y cuentas de liquidación.
- Definir comercio responsable, verificación/onboarding de las lavanderías beneficiarias y tratamiento de fallos parciales del split.
- Asignar tarifas del proveedor, impuestos, devoluciones, contracargos y diferencias de peso.
- Acordar precisión, redondeo y reglas de vigencia para la tasa global.
- Completar webhooks firmados, idempotencia y conciliación de la parte de la plataforma y de cada lavandería.

## Referencias

- [Historias de usuario](historias-usuario.md)
- [Requisitos](requisitos.md)
- [MVP](mvp.md)
