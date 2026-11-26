## 1. Contexto y alcance

**Solicitado:** marketplace familiar de lavanderías para Bogotá. El cliente podrá
comparar lavanderías y servicios, solicitar pedidos, elegir entrega en
establecimiento o domicilio y pagar en la plataforma. Cada lavandería administrará
su catálogo y pedidos; habrá un administrador de plataforma. Se comenzará con la
lavandería familiar, con soporte para múltiples lavanderías independientes desde
el inicio y separación de sus datos y permisos.

**Estado observado:** el repositorio contiene la base NestJS/Expo, conexión
API–PostgreSQL y configuración Docker. US-001.01 incorpora registro de clientes
con OTP y flujo móvil; su aceptación sigue en curso por entrega real y pruebas
de dispositivos. Docker y PostgreSQL 17 ya comprobados. Consultar [contrato y evidencia](us-001.01-registro.md).
La configuración del entorno no equivale a un producto operativo completo.

**Alcance inicial propuesto por el usuario:** catálogo configurable por lavandería,
servicios por peso y de precio fijo, pedidos programados e inmediatos sujetos a
disponibilidad, atención en establecimiento y domicilios operados por cada
lavandería. Clientes y lavanderías usarán una aplicación móvil Android/iOS con
acceso por rol; el administrador tendrá un panel web independiente. Ambos
consumirán el mismo backend y compartirán sus reglas de negocio.

**Límite indicado por el usuario para el MVP:** no desarrollar una red propia de
repartidores ni un sistema de asignación de conductores. Las recomendaciones
adicionales de este documento no son restricciones de alcance aprobadas. Los
detalles técnicos y financieros pendientes se resolverán antes de implementarlos,
sin excluir por ello las funcionalidades solicitadas.

## 2. Requisitos funcionales

**Solicitados:**

- Cliente: consultar y comparar lavanderías y servicios, solicitar pedidos,
  seleccionar establecimiento o domicilio y pagar dentro de la plataforma.
- Catálogo por lavandería: crear, editar, activar y desactivar servicios con
  precios, unidades de cobro, descripciones y condiciones propios, sin un
  catálogo rígido. Contemplar lavado por kilogramo, cobijas y edredones,
  cortinas, prendas individuales y otros servicios configurables.
- Servicios por peso: solicitar con peso estimado o cantidad aproximada; al
  recibir y pesar los artículos, la lavandería registra el peso definitivo y
  actualiza el importe. El cliente debe conocer y aprobar cualquier diferencia
  de precio antes del cobro definitivo. El mecanismo de autorización, ajuste y
  cobro depende de la pasarela por seleccionar.
- Servicios de precio fijo: mostrar el importe al cliente antes de confirmar.
- Disponibilidad: cada lavandería configura horarios y disponibilidad. Admitir
  pedidos programados e inmediatos; estos últimos solo si puede atenderlos.
- Establecimiento: el cliente lleva sus artículos y posteriormente los recoge.
- Domicilio: la lavandería recoge los artículos en la dirección del cliente y
  los devuelve al finalizar. Cada establecimiento configura si lo ofrece, sus
  zonas de cobertura, tarifas y condiciones, y asume la logística.
- Lavandería: el propietario (`OWNER`) administra su establecimiento y puede
  invitar personal (`STAFF`) con cuentas individuales. Ambos acceden solo a las
  funciones permitidas en su lavandería; no hay rol `MANAGER` en el modelo.
- Plataforma: disponer de un administrador y admitir varias lavanderías
  independientes desde la primera versión, aunque inicialmente opere una sola.
- Interfaces: aplicación móvil Android/iOS para clientes y lavanderías y panel
  web administrativo independiente para supervisar lavanderías, clientes,
  pedidos, pagos e incidencias, mediante el mismo backend.

**Recomendados para el MVP, sujetos a aprobación:**

- Identificar a clientes y operadores y autorizar sus acciones según su rol y
  pertenencia a una lavandería; permitir al cliente consultar sus propios pedidos.
- Mostrar información comparable: servicio, modalidad de cobro, precio o regla
  de cálculo, condiciones y opciones de entrega disponibles. Distinguir una
  estimación de un importe definitivo; el catálogo libre requiere acordar cómo
  comparar servicios equivalentes sin imponer una oferta idéntica.
- Registrar servicios, cantidades o medidas aplicables, modalidad de entrega,
  datos de contacto y desglose de importes del pedido. Conservar las condiciones
  acordadas aunque el catálogo cambie después.
- Ofrecer consulta y actualización del estado del pedido, con estados y permisos
  de transición por acordar; registrar aceptación, rechazo y cancelación.
- Conservar el peso estimado y definitivo, el desglose del ajuste y la aprobación
  del cliente asociada al importe autorizado. Verificar disponibilidad y
  cobertura desde el backend al confirmar un pedido.
- Integrar pagos con confirmación verificable en el backend, diferenciar el
  estado del pago del estado del pedido y evitar cobros/pedidos duplicados al
  reintentar. Usar un proveedor que distribuya directamente cada venta entre
  lavandería y plataforma mediante split o capacidad equivalente, sin retener
  en la cuenta bancaria de la plataforma la parte de la lavandería. La comisión
  será una tasa global configurable por el administrador; el 10%/90% es un
  ejemplo, no una tasa fija acordada. Proveedor y detalles de liquidación,
  tarifas, impuestos, ajustes y devoluciones siguen pendientes. Ver
  [decisiones del modelo comercial](decisiones-modelo-comercial.md).
- Permitir el autorregistro de lavanderías con la cuenta creadora como
  propietaria automática; el administrador puede supervisar su operación y
  controlar estados según las facultades que se definan.

**Recomendados para después, sin exclusión aprobada:** reseñas, promociones,
fidelización, chat integrado, recomendaciones personalizadas, analítica avanzada
y optimización automática de rutas. Su necesidad inicial debe confirmarse.

## 3. Requisitos no funcionales

**Decisión de cuentas vigente — 2026-11-25:** aceptar una invitación STAFF
convierte la misma cuenta de cliente en una cuenta de trabajo exclusiva. Conserva
correo, credencial y datos, pierde funciones de cliente y cierra sesiones previas.
OWNER/STAFF siguen siendo roles por lavandería. Esta decisión sustituye cuentas
independientes con correos distintos. Invitaciones para OWNER existentes e
implementación/evidencia en [US-003.01](us-003.01-invitaciones-staff.md); el alta de
lavanderías y la operación comercial conservan sus pendientes.

**Solicitados:** arquitectura sencilla y modular; uso de pnpm; aislamiento de
datos y permisos entre lavanderías; protección de secretos y conservación de
los volúmenes de PostgreSQL. Aplicación móvil para Android/iOS y panel web
independiente, con reglas de negocio y autorización compartidas en el backend.

**Recomendados para el MVP, sujetos a aprobación:**

- Validar autorización y pertenencia en el backend en cada operación; probar
  que un operador no accede a otra lavandería ni un cliente a pedidos ajenos.
- Persistir pedidos y pagos con consistencia; registrar cambios relevantes de
  estado y responsable para resolver incidencias.
- Minimizar datos personales, proteger comunicaciones y credenciales y no
  incluir secretos en la aplicación móvil ni en logs.
- Usar módulos por capacidad de negocio, sin microservicios; introducir
  migraciones reproducibles y un procedimiento de respaldo y restauración.
- Priorizar uso móvil en español, importes claramente expresados y fechas/horas
  de Bogotá; manejar errores y reintentos de red sin perder pedidos.
- Verificar tipos, lint y pruebas de reglas críticas, aislamiento y pagos.
  Acordar objetivos de rendimiento, disponibilidad y dispositivos compatibles
  antes del lanzamiento; todavía no se han establecido cifras.

## 4. Tecnologías seleccionadas

**Ya presentes en el repositorio:** React Native con Expo SDK 58, Expo Router y
TypeScript en `apps/mobile`; NestJS 11 y TypeScript en `apps/api`; PostgreSQL 17
en Compose; monorepo pnpm 12.21.0. Desarrollo en Windows 11 con Docker Desktop,
Docker Compose y Compose Watch; imagen de desarrollo con Node 24.14.0.

Watch sincroniza el código de API, las migraciones SQL y la app móvil y sus
recursos. La API se conecta a PostgreSQL con `pg`, pool y migraciones versionadas;
el esquema inicial cubre cuentas, lavanderías y membresías. El modelo aprobado
usa solo `OWNER`/`STAFF` como roles de lavandería; la migración histórica inicial
incluía `MANAGER`; la migración `007_laundry_membership_roles.sql` ya migra esas membresías a `STAFF` y deja el enum vigente con `OWNER`/`STAFF`, sin editar la inicial. No hay ORM ni pasarela
de pagos seleccionados. La autenticación combina correo/contraseña con OTP vía
Resend y Google (Apple diferido por decisión del usuario), con cuentas y sesiones opacas propias de 7 días.
Código y usuarios de desarrollo disponibles; configuración externa y pruebas
nativas reales siguen pendientes. Las
políticas aprobadas el 2026-11-22 y su entrega incremental están
en [decisiones de autenticación](decisiones-autenticacion.md).

**Decisión de producto para el alcance inicial:** la aplicación Expo atenderá a
clientes y lavanderías mediante roles; habrá un panel web administrativo
independiente conectado a la misma API NestJS. El panel todavía no existe en el
repositorio y su framework no está elegido. Se recomienda mantener módulos de
negocio en esa API y reutilizar contratos de datos entre clientes, sin duplicar
reglas ni introducir microservicios.

## 5. Decisiones pendientes

- **Pagos y ajustes por peso (impacto financiero alto):** seleccionar proveedor
  y métodos compatibles con el flujo; decidir si se cobra después de aprobar
  el peso definitivo o se utiliza una autorización previa con captura/ajuste,
  únicamente si el proveedor lo permite. Definir vigencia de la autorización,
  evidencia y canal de aprobación, rechazo o falta de respuesta, fallos de cobro
  y momento de iniciar el lavado. Estas opciones cambian la experiencia, la
  integración y el riesgo de prestar un servicio aún no cobrado; no se ha
  elegido ninguna ni se presupone que la pasarela admita incrementar importes.
- **Modelo comercial y pagos a lavanderías (impacto financiero alto):** está
  decidido que la plataforma recibe una comisión global configurable y que el
  proveedor debe distribuir directamente la parte de cada lavandería, sin que
  la plataforma la retenga en su cuenta bancaria. Falta seleccionar y verificar
  un proveedor con split disponible en Colombia, definir titularidad/comercio,
  beneficiarios, costos, impuestos, ajustes por peso, reembolsos y contracargos.
  No implementar ni habilitar dinero real hasta resolver esos puntos. Ver
  [decisiones del modelo comercial](decisiones-modelo-comercial.md).
- **Catálogo y precios:** unidades admitidas, mínimos, precisión y redondeos,
  reglas de cálculo y comparación de servicios equivalentes. Un catálogo
  configurable no implica un motor ilimitado de fórmulas; acordar las reglas
  iniciales sin restringir unilateralmente los servicios solicitados.
- **Disponibilidad (impacto técnico relevante):** definir si se controla por
  cupos, capacidad de trabajo o confirmación de la lavandería, y cómo reservar
  disponibilidad ante solicitudes simultáneas. Acordar franjas, anticipación,
  plazos, días no laborables y reprogramaciones. Los horarios por sí solos no
  garantizan capacidad para aceptar un pedido inmediato.
- **Domicilios:** definir cómo se representan y validan zonas, cálculo de
  tarifas, franjas de recogida/devolución, cambios de dirección e intentos
  fallidos. La responsabilidad logística ya corresponde a cada lavandería;
  su representación y coordinación en el sistema siguen pendientes.
- **Interfaces y acceso:** elegir tecnología del panel web y facultades
  administrativas; definir estados/visibilidad pública de lavanderías y el
  tratamiento de usuarios con varios roles. El autorregistro con propietario
  automático ya está decidido. El panel añade una aplicación que mantener y
  verificar; compartir backend evita duplicar reglas de negocio.
- **Pedido y operación:** una o varias lavanderías por pedido, estados,
  cancelaciones, moneda y canales de notificación. Un pedido con varias
  lavanderías implica coordinar importes, entregas y pagos independientes.
- **Base técnica y operación:** decidir si se mantiene `pg` con SQL explícito o
  se adopta un ORM más adelante; configurar Resend y dominio/remitente, elegir despliegue,
  respaldos y tratamiento de datos personales y
  objetivos de servicio. Confirmar las recomendaciones de MVP y de postergación
  antes de convertirlas en compromisos de implementación.

El método y las políticas del registro US-001.01 están resueltos en
`docs/decisiones-autenticacion.md`. La configuración de correo y la validación de
entrega siguen pendientes operativos, no una selección de proveedor. Recuperación
y detalles de renovación de sesiones se concretan en sus historias respectivas.
