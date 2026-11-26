# Backlog de producto: épicas e historias atómicas

Este backlog desglosa `docs/mvp.md` y `docs/requisitos.md`. **Ordena dependencias, no autoriza cambios de alcance.** Los IDs padre `US-001` a `US-014` se conservan como referencias agrupadoras del backlog previo; no son entregables ni se cierran por separado. Las historias implementables llevan sufijo (`US-001.01`). No renumerar IDs publicados: agregar IDs nuevos y marcar los sustituidos como retirados si el alcance cambia.

## Convenciones de priorización y estado

- **P0 — Base crítica:** necesaria para seguridad, consistencia o desbloquear el MVP.
- **P1 — MVP:** necesaria para el recorrido funcional solicitado.
- **P2 — Después:** mejora que no bloquea el MVP. No se incluyen ideas no aprobadas.
- **Pendiente:** no implementada. **En curso:** implementación iniciada, con criterios o validaciones aún pendientes. **Bloqueada:** requiere una decisión indicada abajo. **Hecha:** solo al cumplir todos sus criterios y la definición de terminado.
- Las dependencias apuntan a IDs atómicos. Desarrollar en orden de ID dentro de cada épica, luego avanzar al siguiente trabajo cuyas dependencias estén hechas y cuyos bloqueos resueltos.
- `TBD` significa que el equipo aún debe estimarlo; no se inventaron puntos ni duración.

## Definición de terminado común

Cada historia terminada debe cumplir criterios de aceptación, validar entradas en servidor, aplicar autorización y aislamiento multi-lavandería donde corresponda, guardar cambios de esquema en una migración nueva, cubrir reglas relevantes con pruebas, mostrar estados de error/carga/vacío en la interfaz correspondiente, y actualizar documentación/contratos API afectados. No exponer secretos o datos innecesarios. Una pantalla sola no completa una historia que requiere comportamiento de API o persistencia.

## Épica EP-01 — Acceso, cuentas y sesiones

**Cambio de producto vigente 2026-11-25:** se sustituye la decisión de cuentas/correos separados. Aceptar una invitación STAFF convierte la misma cuenta de cliente en trabajo exclusivo, conserva correo/credenciales/datos, retira capacidades de cliente y revoca sesiones anteriores. Implementación y pruebas de esta ampliación en [US-003.01](us-003.01-invitaciones-staff.md). Los cierres históricos conservan el alcance que fue validado; el nuevo recorrido móvil y la recepción del correo de US-003.01 fueron confirmados por el usuario el 2026-11-25.

**Referencia padre:** US-001. **Prioridad:** P0. **Estado:** En curso. **Decisiones oficiales:** correo/contraseña con OTP vía Resend, Google (Apple diferido por decisión del usuario el 2026-11-23), cuentas/sesiones propias de 7 días. Ampliación y desarrollo conjunto aprobados por el usuario el 2026-11-22 en [decisiones de autenticación](decisiones-autenticacion.md). US-001.03 completada con pruebas técnicas y recorrido web/Android confirmado por el usuario; iOS y preparación para distribución siguen pendientes. La aprobación no completa ninguna otra historia.

**Revisión de cierre 2026-11-25:** las ocho atómicas tienen implementación. Seis están hechas en su alcance funcional registrado: US-001.02/.03/.04/.05/.06/.08. US-001.01 conserva las validaciones de registro pendientes, con dominio/remitente propios diferidos por decisión del usuario para desarrollo; US-001.07, por primer registro Google con identidad nueva, cancelación/restauración Android y configuración/prueba iOS. La recepción de correo en US-003.01 no acredita por sí sola remitente propio ni esos escenarios Google. US-001/EP-01 permanece en curso, incluso considerando iOS diferido.

### US-001.01 — Crear cuenta de cliente
**Como** cliente, **quiero** registrar una cuenta con un medio de contacto, **para** identificar mis pedidos.
**Prioridad:** P0 · **Estado:** En curso · **Esfuerzo:** Por estimar · **Depende de:** — · **Bloqueo de decisión:** resuelto. **Preparación operativa:** primera entrega Resend y registro/ingreso automático confirmados por el usuario con remitente de prueba; el usuario acepta ese remitente para el MVP en desarrollo y difiere dominio/remitente propios; las validaciones restantes conservan su estado. **Avance 2026-11-22:** API, migración y flujo móvil implementados; verificaciones Docker, PostgreSQL 17 y formulario web aprobadas; **Avance 2026-11-23:** usuario confirma en teléfono recepción del OTP, verificación y llegada al panel principal; pendiente dominio propio, escenarios restantes y cobertura Android/iOS. Ver [contrato y evidencia](us-001.01-registro.md).
**Aceptación:**

- Registro por correo y contraseña, sin solicitar teléfono; validar/normalizar correo y rechazar duplicados con mensaje explícito. Google se integra por US-001.07 y crean la misma clase de cuenta CUSTOMER.
- Crear cuenta solo tras verificar OTP de 6 dígitos, de un solo uso y vigencia de 10 minutos. Mantener el registro temporal fuera de `accounts`.
- Máximo 5 intentos incorrectos por proceso; reenvío tras 60 segundos, invalidando código anterior sin reiniciar fallos. Máximo 5 envíos/correo/hora incluido el inicial y 30 envíos/IP/hora, configurables; reinicios no eluden cuotas acumuladas. Controlar cuota global y no bloquear permanentemente el ingreso existente.
- Contraseña de 15–128 caracteres, permite espacios/Unicode, pegar y gestores; mostrar/ocultar, sin composición obligatoria y rechazo de contraseñas comunes/comprometidas. No exigir cambios periódicos sin motivo.
- Hash Argon2id, nunca contraseña ni OTP en claro en persistencia/logs/respuestas; OTP protegido con HMAC y clave de servidor. Parámetros y demás controles según [decisiones oficiales](decisiones-autenticacion.md).
- Crear cuenta `CUSTOMER` sin membresías; consumo de prueba y creación atómicos, sin duplicados por concurrencia/reintento ni sustitución de credenciales por otro flujo.
- Enviar con Resend y verificar entrega real y estados móviles de carga, error, caducidad y reenvío. Decisión del usuario 2026-11-25: el remitente de prueba se admite durante el desarrollo del MVP; dominio/remitente propio se exige antes de enviar a otros destinatarios o distribuir, sin bloquear el desarrollo actual.
- Confirmar creación e integrar ingreso automático con US-001.02 mediante una sesión opaca real, en la misma transacción. No emitir una sesión provisional.

### US-001.02 — Iniciar sesión y cerrar sesión
**Como** usuario registrado, **quiero** abrir y cerrar una sesión, **para** usar mi cuenta de forma controlada.
**Prioridad:** P0 · **Estado:** Hecha · **Esfuerzo:** Por estimar · **Depende de:** US-001.01 (base de registro disponible; dominio/remitente propio conserva su pendiente operativo) · **Diseño:** duración absoluta de 7 días, sin renovación deslizante. **Trazabilidad revisada 2026-11-24:** ingreso, SecureStore, perfil, cierre y registro automático implementados. Hay pruebas API de hash, vigencia de siete días, expiración, error genérico y revocación inmediata; ingreso por contraseña y cierre observados en Android, e ingreso automático tras registro confirmado por el usuario. No se consideran pendientes esos recorridos ya probados. Restauración Android confirmada por el usuario el 2026-11-24: tras seguir la prueba de terminar completamente y reabrir la app sin cerrar sesión, respondió «funciona». Se acredita recuperación de la sesión vigente y acceso al panel sin volver a ingresar, como evidencia manual reportada, no observación directa del agente. Expiración y revocación conservan su evidencia API; no se atribuye una prueba manual adicional. iOS se difiere por decisión del usuario hasta disponer de su entorno, sin exigirlo para continuar el desarrollo Android. US-001.01 conserva pendiente su criterio de dominio/remitente propio. Se cierra en su alcance funcional Android con la evidencia técnica y manual registrada; no se declara validación iOS, entrega de correo a otros destinatarios ni preparación para publicación. La configuración y prueba de Google corresponden a US-001.07; la gestión de otras sesiones, a US-001.05.
**Aceptación:** ingreso por correo/contraseña; credenciales inválidas o sesión revocada reciben error genérico; sesión opaca de duración inicial de 7 días, token almacenado como hash en servidor y en almacenamiento seguro móvil; cierre invalida inmediatamente la sesión; secretos no aparecen en logs ni respuestas. Integrar ingreso automático tras registro verificado con el mismo mecanismo, sin volver a pedir contraseña, según [decisiones oficiales](decisiones-autenticacion.md).

### US-001.03 — Recuperar acceso
**Como** usuario, **quiero** recuperar el acceso a mi cuenta, **para** volver a usarla si pierdo mis credenciales.
**Prioridad:** P1 · **Estado:** Hecha · **Esfuerzo:** Medio · **Depende de:** US-001.01 (base de registro disponible y probada; sus pendientes operativos conservan su estado). **Canal definido:** correo vía Resend. **Decisiones:** plan aprobado el 2026-11-23; OTP diez minutos/cinco fallos, reenvío sesenta segundos, autorización de restablecimiento cinco minutos, cuotas compartidas y revocación de todas las sesiones. Sin acceso al correo, usar proveedor ya vinculado o recuperar el canal. **Evidencia de cierre, conciliada 2026-11-24:** migración 004, API y pantallas implementadas; 38 pruebas e2e de regresión con PostgreSQL 17 y seis unitarias aprobadas. Entrega real, cambio e ingreso con nueva contraseña confirmados en web; el 2026-11-23 el usuario confirmó «Probado y funcionando» en Android y lo ratificó el 2026-11-24. Es prueba manual reportada, sin inferir casos individuales adicionales. Exportación Android/iOS aprobada; no se acredita prueba funcional iOS. El cierre corresponde al alcance funcional validado en web/Android; dominio propio y entrega a otros destinatarios siguen pendientes para distribución, compartidos con US-001.01 y [preparación de publicación](pendientes-publicacion.md). No acredita preparación para producción ni cierra US-001.01. Ver [contrato y validación](us-001.03-recuperacion.md).
**Aceptación:** la respuesta no revela si un contacto está registrado; el token/código expira y solo se usa una vez; los intentos tienen límites.

### US-001.04 — Consultar y actualizar perfil
**Como** usuario autenticado, **quiero** consultar y corregir mis datos personales, **para** mantener mi información vigente.
**Prioridad:** P1 · **Estado:** Hecha · **Esfuerzo:** Por estimar · **Depende de:** US-001.02 (base de sesión disponible; desarrollo de US-001.04 autorizado expresamente el 2026-11-24, sin cerrar las validaciones pendientes de US-001.02).
**Alcance aprobado 2026-11-24:** nombre para mostrar opcional y editable; correo de solo lectura. Se retira el cambio de correo de esta historia por decisión del usuario; no se implementa un flujo OTP de cambio de contacto. Roles y membresías solo se consultan.
**Aceptación:**

- Consultar correo, nombre para mostrar, rol y membresías desde la identidad autenticada.
- Editar únicamente el nombre propio, opcional, de hasta 80 caracteres; normalizar Unicode y espacios de los extremos, rechazar controles y datos de tipo/formato incorrectos. Vaciarlo elimina el nombre, no la cuenta.
- Rechazar campos ajenos al nombre, incluidos correo, identificadores de cuenta, roles y membresías; el backend obtiene la cuenta desde la sesión y no ofrece edición de perfiles ajenos.
- Persistir el nombre y reflejarlo en perfil e inicio; conservar el borrador ante fallo y permitir reintento sin duplicar efectos.
- Mostrar Google debajo de Ingresar, con formulario compacto y ojo dentro del campo de contraseña. La principal ofrece acceso Perfil arriba a la derecha y menú hamburguesa lateral; no ofrece vinculación de Google ni presenta catálogo/pedidos como operativos.
- Comprobar autorización, validación, persistencia y regresión; distinguir evidencia web/Android/iOS y conservar pendientes no ejecutados. Ver [contrato y validación](us-001.04-perfil.md).

**Cierre funcional Android, confirmado 2026-11-24:** migración 005, API, edición de nombre, principal y menú implementados. Además de la prueba inicial, el usuario confirmó ojo integrado, login compacto/Google, apertura/navegación/cierre del menú lateral, ausencia de vinculación Google y hamburguesa solo con sesión. Son pruebas manuales reportadas, sin inferir casos individuales adicionales de red o accesibilidad. Lint/compilación API, seis unitarias y 58 e2e PostgreSQL 17 aprobados; lint/tipos móvil y exportación web/Android/iOS aprobados. La restauración de sesión al reabrir queda pendiente en US-001.02. iOS se difiere hasta disponer del entorno del usuario; no se acredita prueba iOS ni preparación de publicación.

### US-001.05 — Consultar y revocar sesiones activas
**Como** usuario, **quiero** consultar y cerrar mis sesiones activas, **para** controlar los accesos y proteger mi cuenta en dispositivos perdidos.
**Prioridad:** P1 · **Estado:** Hecha (alcance funcional Android/web; validada por el usuario el 2026-11-24) · **Esfuerzo:** Medio · **Depende de:** US-001.02.
**Aceptación aprobada y concretada 2026-11-24:** listar únicamente sesiones propias vigentes/no revocadas, identificar la actual, plataforma informativa y fechas; paginar otros accesos; revocar cualquiera propia con confirmación; nuevas llamadas con el acceso revocado reciben 401; el cierre actual limpia el cliente; guardar fecha y auditoría de actor/destino sin tokens en claro. Verificar propietario en servidor, reintentos/concurrencia sin duplicar eventos, errores/red y estados móviles de carga/vacío. Mantener siete días absolutos y accesos de correo/Google existentes.
**Avance 2026-11-24:** migración 006, API y ruta `/sesiones` con diseño moderno global implementadas. Lint/compilación API, seis unitarias y 70 e2e PostgreSQL 17 aprobados; lint/tipos móvil y recorrido web de dos sesiones, revocación remota y propia aprobados. El usuario realizará la prueba en el emulador. Conservar pendiente esa evidencia y las limitaciones nativas; iOS sigue diferido. Ver [contrato y prueba manual](us-001.05-sesiones.md).
**Corrección posterior 2026-11-24:** el usuario probó Android y reportó recorte/crash del panel y demora del cierre remoto. Se corrigió el puente RN/Compose con RNHostView, ancho/altura/scroll y apertura expandida. Monitor de sesión cada cinco segundos en primer plano, con pausa/reanudación y protección contra fallos de red. Cierre remoto sin crash observado en Android, salida web sin interacción y panel 320×480 verificados; seis pruebas nuevas del monitor y lint/tipos aprobados. La corrección por sí sola no cerró la historia.
**Aceptación final 2026-11-24:** el usuario confirmó «validada, ya la probe y funciona bien» tras su revalidación en el emulador. US-001.05 queda hecha en el alcance funcional Android/web. La confirmación se registra como reporte del usuario; no acredita pruebas adicionales de iOS, accesibilidad o escenarios nativos no detallados.

### US-001.06 — Aplicar autorización por rol en API
**Como** responsable de seguridad, **quiero** que el backend valide rol y alcance de cada acción, **para** evitar accesos no autorizados aunque se altere el cliente.
**Prioridad:** P0 - **Estado:** Hecha (alcance funcional Android/API; validada por el usuario el 2026-11-25) - **Esfuerzo:** Por estimar - **Depende de:** US-001.02. **Avance de implementación (2026-11-25):** guard global de sesión más `AuthorizationGuard` reutilizable con políticas declarativas para rol de plataforma y membresía por lavandería; las rutas de acceso exigen `PLATFORM_ADMIN` o pertenencia `OWNER`/`STAFF`. La migración 007 convierte membresías heredadas `MANAGER` a `STAFF` y elimina ese valor del enum vigente. La app móvil ahora modela y muestra solo `OWNER` y `STAFF`, sin cambio de layout. La batería e2e completa ya pasó en Docker con PostgreSQL 17 tras autorizar ejecución puntual fuera del sandbox; el usuario confirmó su funcionamiento en el emulador el 2026-11-25.
**Aceptación:** rutas protegidas deniegan por defecto; rol de plataforma y membresía (`OWNER` o `STAFF`) se resuelven desde identidad confiable; pruebas cubren cliente, propietario, staff y administrador de plataforma. El autorregistro puede crear una membresía `OWNER` solo para la lavandería nueva creada por esa cuenta; nunca permite reclamar otra lavandería ni enviar un rol para autoasignárselo. Las autorizaciones de acciones de negocio se incorporan en sus historias y rutas respectivas.
**Revalidación 2026-11-25:** lint/compilación API y 14 pruebas unitarias aprobados también en Docker; batería completa **8 suites y 75 pruebas e2e aprobadas con PostgreSQL 17**, incluidas las tres pruebas de migración 007. El fallo inicial `connect EACCES 127.0.0.1` correspondía a la ejecución restringida de Windows; las mismas HTTP pasan dentro del contenedor. Migraciones 001–007 verificadas en la base local, enum vigente OWNER/STAFF, salud API/base 200/ok y cero bases temporales de pruebas restantes. Lint móvil y tipos aprobados tras regenerar los tipos locales de Expo Router. Se corrigió una aserción e2e que todavía esperaba una membresía total cuando el fixture ya crea dos: ahora comprueba que la cuenta nueva no recibe ninguna, y la prueba pasó por HTTP. El usuario confirmó «Funciona» tras recibir la guía del emulador el 2026-11-25. Se registra aceptación funcional Android/API por reporte del usuario, sin inferir casos manuales específicos ni prueba iOS; evidencia detallada en la nota existente del proyecto en Obsidian. La consulta sobre la etiqueta «Tipo de cuenta: Cliente» se aclaró distinguiendo el rol de plataforma del rol OWNER/STAFF por lavandería; no se cambió la interfaz.

### US-001.07 — Acceder con Google
**Como** usuario, **quiero** entrar con Google en Android/iOS, **para** usar mi identidad existente sin otra contraseña.
**Prioridad:** P0 - **Estado:** En curso - **Esfuerzo:** Por estimar - **Depende de:** US-001.02. **Avance:** cliente web y Android configurados; el usuario confirmó en Android el acceso y reingreso de una cuenta existente. Registro Google nuevo, cancelación/restauración e iOS siguen pendientes (detalle de evidencia abajo).
**Aceptación:** Google en Android/iOS; firma/emisor/audiencia/vigencia/nonce verificados en servidor; desafío de cinco minutos y cinco intentos, de un solo uso; identidad estable por proveedor/sub; cuenta CUSTOMER sin membresías; sesión opaca común; no vincular por coincidencia de correo ni permitir nuevas vinculaciones a cuentas existentes; colisión de correo indica usar el método original; identidades anteriores conservan acceso; errores/cancelación y almacenamiento seguro móvil; configuración real y pruebas nativas con Google. Apple se retira del alcance por decisión del usuario el 2026-11-23; reconsiderarlo en el futuro antes de publicar en App Store, sin bloquear el cierre actual. **Avance (2026-11-23):** cliente web configurado; cliente Android y cuenta de pruebas confirmados por el usuario. Build local x86_64 e instalación aprobados, firma comprobada; selector/consentimiento Google y rechazo seguro de correo existente observados en Pixel_8a API 36. Vinculación explícita, cierre y reingreso Google hasta Mi cuenta comprobados visualmente en Android. **Cambio aprobado 2026-11-24:** se retiran botón y endpoints de vinculación, preservando accesos anteriores; la evidencia de vinculación del 2026-11-23 es histórica. Pendientes primer registro con identidad Google nueva, cancelación/restauración y configuración/prueba iOS. Ver [guía](configuracion-acceso-y-pruebas.md).

### US-001.08 — Sembrar usuarios de desarrollo
**Como** desarrollador, **quiero** cuentas ficticias con distintos roles y lavanderías, **para** probar ingreso, permisos y funciones futuras sin registrar usuarios reales.
**Prioridad:** P1 · **Estado:** Hecha · **Esfuerzo:** Por estimar · **Depende de:** US-001.02 (base de ingreso disponible y probada).
**Aceptación:** comando explícito solo de desarrollo; siete cuentas y dos lavanderías; ejecución idempotente sin sobrescribir credenciales/datos ajenos; contraseña solo en entorno privado; fixtures y sesiones rechazados en producción; no simular identidades Google/Apple ni exponer OTP. **Evidencia:** seed ejecutado y repetido, hashes conservados; ingreso/perfil/cierre de las siete cuentas y bloqueo de seed en producción comprobados. Los roles no adelantan funcionalidades de negocio pendientes.

## Épica EP-02 — Alta y control de lavanderías

**Referencia padre:** US-002. **Prioridad:** P0. **Estado:** Pendiente. **Bloqueo:** reglas de estado operativo y visibilidad pública; el autorregistro con propietario automático ya está decidido.

### US-002.01 - Registrar lavandería
**Como** propietario de un establecimiento, **quiero** registrar mi lavandería directamente, **para** incorporarla al marketplace sin que un administrador cree previamente el establecimiento o me invite.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-001.06.
**Aceptación:** se validan los datos requeridos; cuenta y lavandería quedan asociadas atómicamente con rol `OWNER`, clasificando la cuenta como trabajo exclusivo; el propietario obtiene acceso sin invitación o aprobación administrativa previa; el alta queda auditada. El estado operativo, la visibilidad pública y la verificación comercial se definen por separado, sin impedir el alta de la relación propietaria. Ver [decisiones del modelo comercial](decisiones-modelo-comercial.md).

### US-002.02 - Asociar responsable inicial
**Estado:** Reemplazada por US-002.01 en la decisión del 2026-11-25; conservar este ID por trazabilidad, no planificar como trabajo independiente. El registro directo crea la relación propietaria automáticamente. La incorporación posterior de otros operadores se gestiona con US-003.01.

### US-002.03 - Controlar el estado operativo de una lavandería
**Como** administrador, **quiero** suspender o reactivar una lavandería, **para** controlar su operación en la plataforma.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-002.01.
**Aceptación:** solo administrador autorizado cambia el estado operativo; una lavandería suspendida no recibe pedidos nuevos; pedidos existentes siguen consultables según política; se guarda actor, motivo y fecha. El control operativo no condiciona el registro inicial ni la relación automática del propietario.

### US-002.04 — Consultar ficha y estado de lavandería
**Como** administrador, **quiero** ver datos y estado de una lavandería, **para** gestionar su incorporación y soporte.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-002.01, US-014.01.
**Aceptación:** la búsqueda no expone credenciales; se muestran estado y datos operativos necesarios; acceso queda restringido a administradores autorizados.

## Épica EP-03 — Miembros y aislamiento multi-lavandería

**Referencia padre:** US-003. **Prioridad:** P0. **Estado:** En curso. **Bloqueo:** permisos detallados por operación; los únicos roles de membresía aprobados son `OWNER` y `STAFF`.

### US-003.01 - Invitar staff
**Como** propietario (`OWNER`), **quiero** invitar a una persona como staff de mi lavandería, **para** delegar labores con una cuenta individual.
**Prioridad:** P0 · **Estado:** Hecha (alcance funcional Android/API con OWNER existentes; recorrido y correo confirmados por el usuario el 2026-11-25) · **Esfuerzo:** Por estimar · **Depende de:** US-001.06, US-002.01.
**Aceptación:** solo `OWNER` autorizado invita; se invita el correo de una cuenta existente o de una persona que complete el registro y verificación antes de aceptar; aceptar convierte la misma cuenta de cliente en trabajo exclusivo, conservando correo/credenciales/datos y retirando sus capacidades de cliente; requiere confirmación explícita y revoca sesiones anteriores; invitación expira y no se reutiliza; al aceptarla se crea exclusivamente una membresía `STAFF` para la lavandería indicada; nunca crea otra lavandería ni concede `OWNER` o `PLATFORM_ADMIN`.

**Ampliación autorizada 2026-11-25:** el usuario pidió implementar la conversión exclusiva por invitación con OWNER existentes. US-002.01 continúa pendiente y no se implementa como efecto secundario. Migración 008, tipo persistente de cuenta, sesiones rotadas, invitaciones por correo con bandeja autenticada, confirmación y controles por lavandería implementados. Batería completa: 90 e2e en 9 suites PostgreSQL 17 aprobados. El usuario confirmó «Listo, funciona» el 2026-11-25 tras la entrega del nuevo flujo. Se registra aceptación funcional Android/API por reporte del usuario, sin inferir escenarios manuales específicos ni prueba iOS. El usuario confirmó además «SI, me llego el correo tambien», acreditando recepción real de la invitación. Queda hecha en el alcance funcional Android/API con OWNER existentes; iOS y el alta de lavanderías siguen fuera de esta aceptación. Ver [contrato y prueba manual](us-003.01-invitaciones-staff.md).

### US-003.02 - Administrar el rol de staff
**Como** propietario (`OWNER`), **quiero** administrar el acceso de los miembros staff, **para** limitar sus facultades a su función.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-003.01.
**Aceptación:** el único rol asignable por invitación es `STAFF`; `OWNER` se establece al registrar la lavandería y no puede asignarse mediante esta operación; cambios surten efecto en API y quedan auditados; ninguna membresía puede elevar a `PLATFORM_ADMIN`. La transferencia de propiedad queda fuera de alcance hasta que se defina una historia específica.

### US-003.03 - Revocar acceso de staff
**Como** propietario (`OWNER`), **quiero** retirar el acceso de un miembro staff, **para** proteger la operación cuando ya no trabaja aquí.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-003.01.
**Aceptación:** la membresía `STAFF` revocada no autoriza nuevas llamadas; los pedidos históricos mantienen su autoría; revocación auditada. La propiedad no se revoca ni transfiere por esta operación.

### US-003.04 — Aislar recursos por lavandería
**Como** operador de plataforma, **quiero** que cada consulta y mutación quede acotada a la membresía autorizada, **para** impedir filtraciones entre establecimientos.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-001.06, US-003.01.
**Aceptación:** pruebas negativas alteran `laundryId` y reciben denegación/no encontrado; tanto `OWNER` como `STAFF` quedan limitados a sus membresías; listados no mezclan tenants; claves y consultas mantienen relaciones coherentes.

## Épica EP-04 — Catálogo y precios

**Referencia padre:** US-004. **Prioridad:** P1. **Estado:** Pendiente. **Bloqueo parcial:** unidades, mínimos, precisión y redondeo.

### US-004.01 — Crear servicio
**Como** miembro autorizado, **quiero** crear un servicio con descripción y condiciones, **para** publicar una oferta propia.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-003.02.
**Aceptación:** servicio pertenece al tenant autenticado; se validan campos obligatorios; se crea inicialmente inactivo hasta completar precio y condiciones.

### US-004.02 — Configurar precio y unidad
**Como** responsable, **quiero** indicar precio, unidad y tipo de cobro, **para** reflejar cómo cobra mi lavandería.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-004.01.
**Aceptación:** distingue precio fijo de por peso/unidad; valores monetarios usan precisión exacta; reglas incompletas no pueden activarse; formato visible antes de publicar.

### US-004.03 — Editar servicio y conservar historial comercial
**Como** responsable, **quiero** corregir la ficha o tarifa de un servicio, **para** mantener la oferta actualizada.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-004.02.
**Aceptación:** solo la lavandería propietaria edita; cambios aplican a nuevos pedidos; pedidos ya aceptados conservan su snapshot; cambio de precio queda fechado.

### US-004.04 — Activar y desactivar servicio
**Como** responsable, **quiero** controlar si el servicio se ofrece, **para** pausar o publicar la venta.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-004.02.
**Aceptación:** solo activos aparecen en pedidos nuevos; desactivar no borra datos ni altera pedidos existentes; estado queda visible al operador.

### US-004.05 — Mantener servicios de prendas y artículos configurables
**Como** responsable, **quiero** describir cobijas, edredones, cortinas, prendas individuales y otros servicios, **para** adaptar el catálogo a mi establecimiento.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-004.01, US-004.02.
**Aceptación:** no se obliga a usar un listado cerrado de categorías; cada servicio indica unidad/precio/condiciones; la ficha se presenta sin aparentar equivalencias incorrectas.

## Épica EP-05 — Descubrimiento y comparación

**Referencia padre:** US-005. **Prioridad:** P1. **Estado:** Pendiente. **Bloqueo:** regla de equivalencia y moneda.

### US-005.01 — Explorar lavanderías activas
**Como** cliente, **quiero** ver lavanderías disponibles, **para** encontrar opciones en Bogotá.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-002.03.
**Aceptación:** solo activas; resultado no expone datos privados de negocio; estado vacío/error se comunica.

### US-005.02 — Ver ficha de lavandería
**Como** cliente, **quiero** revisar ubicación, horarios, modalidades y condiciones, **para** decidir si puedo usar el establecimiento.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-005.01, US-008.01, US-009.01.
**Aceptación:** la ficha muestra información publicada y vigente; no muestra modalidades deshabilitadas; fechas/horas usan zona de Bogotá.

### US-005.03 — Ver catálogo publicado
**Como** cliente, **quiero** consultar servicios activos, precios, unidades y condiciones, **para** elegir qué solicitar.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-004.04.
**Aceptación:** distingue fijo de estimado/por peso; precios antiguos no aparecen como actuales; no se ofrece un servicio pausado.

### US-005.04 — Comparar ofertas
**Como** cliente, **quiero** comparar servicios y modalidades de varias lavanderías, **para** elegir con información comparable.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-005.03.
**Aceptación:** comparación expone unidad, condiciones y tarifa; no ordena como equivalentes servicios distintos; filtros y orden no ocultan cargos relevantes.

## Épica EP-06 — Crear pedido y experiencia de cliente

**Referencia padre:** US-006. **Prioridad:** P1. **Estado:** Pendiente.

### US-006.01 — Seleccionar lavandería y servicios
**Como** cliente, **quiero** elegir una lavandería y uno o varios servicios de su catálogo activo, **para** iniciar una solicitud.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-001.02, US-005.03.
**Aceptación:** todos los ítems pertenecen a la lavandería elegida; el backend valida que sigan activos; una solicitud no combina lavanderías sin decisión explícita.

### US-006.02 — Capturar cantidades y estimaciones
**Como** cliente, **quiero** indicar prendas, unidades o peso aproximado según servicio, **para** estimar el pedido.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-006.01, US-012.01.
**Aceptación:** campos siguen unidad y límites configurados; estimación se rotula como tal; el cliente no puede escribir el precio final.

### US-006.03 — Revisar precio fijo y desglose
**Como** cliente, **quiero** revisar servicios, cargos y total de precio fijo, **para** confirmar con precio visible.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-006.01, US-004.02.
**Aceptación:** presenta precio y tarifa de entrega antes de confirmar; el cálculo de servidor coincide con las líneas; cambios de catálogo obligan a recalcular y mostrar el nuevo importe.

### US-006.04 — Confirmar solicitud con protección ante reintentos
**Como** cliente, **quiero** enviar la solicitud y recibir confirmación, **para** saber que fue registrada una sola vez.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-006.03.
**Aceptación:** servidor crea pedido con snapshot; petición repetida con misma clave idempotente no duplica; respuesta incluye identificador y estado inicial.

### US-006.05 — Consultar mis pedidos
**Como** cliente, **quiero** ver la lista y detalle de mis pedidos, **para** seguir cada servicio contratado.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-006.04, US-007.02.
**Aceptación:** solo devuelve pedidos de la cuenta autenticada; detalle muestra snapshot e historial visible; ID ajeno no da acceso.

## Épica EP-07 — Operación y estado de pedidos

**Referencia padre:** US-007. **Prioridad:** P1. **Estado:** Pendiente. **Bloqueo parcial:** catálogo final de transiciones y cancelación.

### US-007.01 — Recibir y listar pedidos de la lavandería
**Como** miembro autorizado, **quiero** ver solicitudes de mi establecimiento, **para** organizar su atención.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-003.02, US-006.04.
**Aceptación:** solo ve su tenant; filtro por estado/fecha; datos personales se limitan a lo necesario para cumplir el pedido.

### US-007.02 — Aceptar o rechazar pedido
**Como** miembro autorizado, **quiero** aceptar o rechazar una solicitud, **para** confirmar si puedo atenderla.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-007.01, US-008.03.
**Aceptación:** transición validada en API; respuesta se comunica al cliente; motivo de rechazo queda registrado; repetición no duplica acciones.

### US-007.03 — Avanzar estado operativo
**Como** miembro autorizado, **quiero** marcar recepción, proceso y finalización, **para** informar el avance real.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-007.02.
**Aceptación:** solo transiciones permitidas; actor/fecha quedan en historial; pago y pedido tienen estados independientes.

### US-007.04 — Cancelar pedido de forma controlada
**Como** cliente o lavandería autorizado, **quiero** cancelar cuando las reglas lo permiten, **para** resolver una solicitud que ya no se realizará.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-007.02, US-013.05.
**Aceptación:** API valida actor, estado y plazo; motivo se registra; impacto en pago/reembolso sigue decisión comercial y nunca se simula como completado.

## Épica EP-08 — Horarios, programación y capacidad

**Referencia padre:** US-008. **Prioridad:** P1. **Estado:** Bloqueada parcialmente por el modelo de capacidad.

### US-008.01 — Configurar horario de atención
**Como** responsable, **quiero** definir días y horas de servicio, **para** mostrar cuándo atiende el establecimiento.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-003.02. **Bloqueo:** excepciones/festivos y horario para solicitudes.
**Aceptación:** se valida zona horaria Bogotá y rangos coherentes; cliente consulta horario vigente; cada lavandería mantiene el suyo.

### US-008.02 — Publicar franjas programables
**Como** responsable, **quiero** definir anticipación y franjas para pedidos futuros, **para** ordenar la carga de trabajo.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-008.01. **Bloqueo:** duración/cupo y reglas de reprogramación.
**Aceptación:** no ofrece franjas fuera de horario; reglas se muestran antes de confirmar; cambios no alteran silenciosamente pedidos aceptados.

### US-008.03 — Reservar capacidad sin sobreventa
**Como** lavandería, **quiero** que solicitudes concurrentes respeten capacidad disponible, **para** no aceptar más trabajo del que puedo atender.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-008.02, US-006.04. **Bloqueo:** unidad de capacidad (pedidos, peso, cupo o confirmación manual).
**Aceptación:** operación de reserva es atómica; dos solicitudes concurrentes no exceden el límite; expiración/liberación de reservas sigue regla acordada.

### US-008.04 — Solicitar pedido inmediato solo con disponibilidad
**Como** cliente, **quiero** pedir atención inmediata cuando esté disponible, **para** saber que la lavandería puede recibirlo.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-008.03, US-007.02.
**Aceptación:** API comprueba horario/capacidad al confirmar; si cambia entre consulta y envío responde sin crear pedido falso; alternativa programada se ofrece si existe.

## Épica EP-09 — Entrega y recogida en establecimiento

**Referencia padre:** US-009. **Prioridad:** P1. **Estado:** Pendiente.

### US-009.01 — Publicar modalidad de establecimiento
**Como** responsable, **quiero** configurar si recibo y entrego artículos en el local, **para** ofrecer esa opción.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-003.02.
**Aceptación:** modalidad se activa/desactiva por lavandería; dirección e instrucciones se validan; solo se muestra activa.

### US-009.02 — Elegir atención en establecimiento
**Como** cliente, **quiero** elegir llevar y recoger en el local, **para** confirmar un pedido sin domicilio.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-006.01, US-009.01.
**Aceptación:** modalidad y local aparecen en resumen antes de confirmar; pedido guarda snapshot de lugar e instrucciones; no se crea tarea de conductor.

### US-009.03 — Registrar recepción y entrega al cliente
**Como** miembro autorizado, **quiero** registrar que recibí y entregué artículos, **para** dejar constancia del flujo en tienda.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-007.03, US-009.02.
**Aceptación:** transiciones requieren rol autorizado; cada hito tiene hora y actor; historial es visible al cliente en lenguaje claro.

## Épica EP-10 — Domicilios gestionados por lavandería

**Referencia padre:** US-010 y US-011. **Prioridad:** P1. **Estado:** Bloqueada parcialmente por reglas de cobertura/logística.

### US-010.01 — Habilitar domicilios
**Como** responsable, **quiero** encender o apagar el servicio a domicilio, **para** aceptar pedidos solo cuando puedo operar la logística.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-003.02.
**Aceptación:** opción es por lavandería; apagado impide nuevas solicitudes; pedidos existentes conservan su modalidad.

### US-010.02 — Configurar zonas cubiertas
**Como** responsable, **quiero** definir zonas de recogida y devolución, **para** limitar domicilios a sectores atendibles.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-010.01. **Bloqueo:** representación de zona (barrios, polígonos o código postal) y fuente de geocodificación.
**Aceptación:** zonas validadas y vinculadas a un tenant; backend evalúa direcciones; cambio de zona no invalida pedidos ya confirmados.

### US-010.03 — Configurar tarifa y condiciones
**Como** responsable, **quiero** fijar tarifa y condiciones de domicilio, **para** informar el costo de la logística.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-010.01. **Bloqueo:** tarifa plana/por zona/distancia y reglas de devolución.
**Aceptación:** tarifa usa valor exacto; condiciones se muestran antes de aceptar; pedido conserva el valor aplicado.

### US-010.04 — Validar dirección y cotizar domicilio
**Como** cliente, **quiero** ingresar dirección y conocer cobertura/costo, **para** decidir si solicito recogida.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-010.02, US-010.03.
**Aceptación:** dirección fuera de zona no puede confirmarse; tarifa y condiciones aparecen en resumen; se minimizan datos personales almacenados.

### US-010.05 — Coordinar recogida y devolución con la lavandería
**Como** miembro de lavandería, **quiero** registrar coordinación y realización de ambos trayectos, **para** gestionar la logística propia.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-007.03, US-010.04. **Bloqueo:** franjas, cambios de dirección e intentos fallidos.
**Aceptación:** lavandería actualiza estados de recogida/devolución; el cliente los consulta; no se asigna conductor de plataforma.

## Épica EP-11 — Servicios por peso y aprobación de precio

**Referencia padre:** US-012. **Prioridad:** P1. **Estado:** Bloqueada parcialmente por reglas de pesaje y rechazo.

### US-012.01 — Solicitar servicio por peso con estimación
**Como** cliente, **quiero** indicar peso aproximado, **para** enviar una solicitud de lavado por kilogramo.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-004.02, US-006.01. **Bloqueo:** mínimo, unidad y redondeo.
**Aceptación:** estimación no se presenta como importe final; se guarda cantidad/unidad aportada; validación evita valores negativos o fuera de rango.

### US-012.02 — Registrar peso definitivo y evidencia
**Como** miembro autorizado, **quiero** registrar el peso recibido, **para** calcular el precio real del servicio.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-007.02, US-012.01. **Bloqueo:** precisión, dispositivo/método y reglas de evidencia.
**Aceptación:** peso se guarda con unidad, operador y fecha; valor negativo/no válido se rechaza; historial conserva la estimación original.

### US-012.03 — Calcular y proponer diferencia
**Como** cliente, **quiero** ver el peso y desglose final propuestos, **para** entender cualquier cambio en el importe.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-012.02. **Bloqueo:** mínimo, redondeo, impuestos/cargos.
**Aceptación:** cálculo de servidor muestra base, peso, tarifa, cargos y diferencia; versión de precio queda inmutable; no se inicia cobro de la diferencia todavía.

### US-012.04 — Aprobar o rechazar precio revisado
**Como** cliente, **quiero** aprobar o rechazar el nuevo importe, **para** consentirlo antes del cobro definitivo.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-012.03. **Bloqueo:** consecuencia de rechazo/no respuesta y límite de tiempo.
**Aceptación:** acción explícita autenticada y asociada a una versión concreta del precio; no responder no equivale a aprobación; aprobación repetida es idempotente y queda auditada.

### US-012.05 — Resolver precio rechazado o sin respuesta
**Como** lavandería, **quiero** conocer el estado de una propuesta no aprobada, **para** saber si debo detener o devolver el pedido.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-012.04. **Bloqueo:** política de devolución, almacenamiento y cancelación.
**Aceptación:** pedido queda bloqueado para cobro final y para transiciones incompatibles; se comunica el siguiente paso definido; se registra resolución sin borrar el historial.

## Épica EP-12 — Pagos, reembolsos y conciliación

**Referencia padre:** US-013. **Prioridad:** P0 para seguridad; implementación bloqueada hasta decisiones comerciales.

### US-013.01 - Seleccionar proveedor y cerrar detalles del modelo de pagos
**Como** responsable de producto, **quiero** validar una pasarela compatible con split de pagos, **para** distribuir cada venta directamente entre la plataforma y la lavandería.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** decisión de comisión aprobada el 2026-11-25. **Bloqueo:** evaluación con documentación oficial vigente y cierre de reglas financieras/operativas.
**Aceptación:** el proveedor opera en Colombia y admite distribución directa de fondos por transacción; se documentan métodos, moneda, comercio responsable, alta de lavanderías beneficiarias, costos, tiempos de liquidación, tarifas, impuestos, devoluciones, contracargos y capacidades para ajustes por peso. Se confirma que la parte de la lavandería no queda retenida en la cuenta bancaria de la plataforma. No se habilita dinero real mientras falten estos datos. La comisión es una tasa global configurable por el administrador; 10%/90% es solo un ejemplo, no el valor predeterminado aprobado. Ver [decisiones del modelo comercial](decisiones-modelo-comercial.md).

### US-013.02 — Crear intento de pago seguro
**Como** cliente, **quiero** iniciar pago de un pedido, **para** pagar el importe que acepté.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-006.03, US-013.01.
**Aceptación:** servidor crea intento idempotente por pedido e importe aprobado, calcula la tasa global vigente y los importes split; conserva la tasa, importes y destinatarios aplicados; checkout no expone secreto del proveedor; cliente no puede alterar importe, tasa ni destinatario. El proveedor distribuye directamente los fondos.

### US-013.03 — Confirmar estado desde webhook verificado
**Como** sistema, **quiero** validar notificaciones firmadas del proveedor, **para** actualizar pago sin confiar en el retorno del cliente.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-013.02.
**Aceptación:** firma, referencia y resultado de la distribución split se verifican; duplicados/eventos fuera de orden no duplican transición ni liquidación; datos de pago se registran con redacción segura.

### US-013.04 — Mostrar estado de pago por separado del pedido
**Como** cliente y lavandería, **quiero** ver el estado financiero y operativo por separado, **para** no confundir pago pendiente con servicio completado.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-013.03, US-007.03.
**Aceptación:** estados se derivan del servidor; la app no marca pagado por redirección; errores y pendiente explican siguiente paso.

### US-013.05 — Gestionar fallos, reintentos y resultado incierto
**Como** cliente, **quiero** reintentar un pago fallido sin duplicar cobros, **para** completar mi pedido de forma segura.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-013.03.
**Aceptación:** idempotencia en intentos; resultado incierto se reconcilia antes de nuevo cobro; pedido no avanza a estado pagado sin evidencia del proveedor.

### US-013.06 — Capturar diferencia, reembolsar y conciliar
**Como** responsable financiero, **quiero** conciliar el importe aprobado, la comisión, la parte de la lavandería y las devoluciones, **para** cuadrar cada venta con sus destinatarios.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-012.04, US-013.01, US-013.03. **Bloqueo:** proveedor y reglas de split/ajuste/devolución.
**Aceptación:** cobro y split coinciden con el precio aprobado y la tasa guardada para el intento; diferencia no se ejecuta si proveedor no la soporta; reembolso registra razón/actor/referencia y efecto en ambas partes; reporte concilia pagos, comisión e importes liquidados a cada lavandería sin guardar tarjeta.

## Épica EP-13 — Panel administrativo y atención

**Referencia padre:** US-014. **Prioridad:** P1. **Estado:** Bloqueada por tecnología web y permisos de administración.

### US-014.01 — Definir y crear cliente web administrativo
**Como** equipo de producto, **quiero** elegir framework y despliegue del panel, **para** mantener una aplicación web independiente que use la API compartida.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** — · **Bloqueo:** selección tecnológica del usuario.
**Aceptación:** decisión documenta compatibilidad, mantenimiento y autenticación; panel no replica reglas de negocio; no comparte secretos de servidor con móvil.

### US-014.02 — Acceder al panel con rol administrador
**Como** administrador, **quiero** ingresar al panel, **para** supervisar la plataforma con permisos restringidos.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-001.06, US-014.01.
**Aceptación:** usuario no administrador recibe acceso denegado en API; sesión tiene expiración; acciones críticas requieren confirmación y quedan auditadas.

### US-014.03 — Buscar y revisar operación
**Como** administrador, **quiero** buscar lavanderías, clientes, pedidos y pagos, **para** responder consultas e incidencias.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-014.02, US-002.04, US-006.05, US-013.04.
**Aceptación:** filtros paginados; acceso mínimo necesario; búsqueda no revela datos de pago sensibles; detalle refleja datos persistidos del backend.

### US-014.04 — Registrar y dar seguimiento a incidencia
**Como** administrador, **quiero** registrar una incidencia relacionada con pedido o pago, **para** darle seguimiento hasta su resolución.
**Prioridad:** P1 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-014.02, US-014.03. **Bloqueo parcial:** estados, responsables y canales de comunicación.
**Aceptación:** incidencia se vincula a recurso y responsable; cambios tienen actor/fecha; solo roles autorizados consultan datos personales asociados.

### US-014.05 - Configurar comisión global de la plataforma
**Como** administrador de plataforma, **quiero** configurar la tasa global de comisión, **para** definir qué parte de cada venta corresponde a la plataforma y qué parte se distribuye a la lavandería.
**Prioridad:** P0 · **Estado:** Pendiente · **Esfuerzo:** Por estimar · **Depende de:** US-001.06, US-013.01, US-014.02; US-014.01 para interfaz web. **Bloqueo parcial:** definición de precisión, redondeo y tarifas del proveedor.
**Aceptación:** solo administradores de plataforma pueden consultar/cambiar la tasa; se valida el rango y precisión acordados antes de implementar; cada cambio registra actor y fecha; una tasa se aplica a intentos nuevos y no reescribe intentos/transacciones ya iniciados; se conserva evidencia de tasa y montos en cada venta. 10% es un ejemplo, no un valor inicial aprobado.

## Decisiones que bloquean historias

1. Método de autenticación, verificación de registro, proveedor de correo y duración inicial/revocación de sesiones resueltos en [decisiones oficiales](decisiones-autenticacion.md). US-001.01 está implementada con Resend; dominio/remitente propios están diferidos para distribución por decisión del usuario y no bloquean el desarrollo actual; las validaciones restantes conservan su estado. US-001.03 queda hecha con evidencia técnica y recorrido web/Android confirmado por el usuario; iOS y distribución siguen pendientes. US-001.02 tiene duración absoluta de siete días sin renovación deslizante; sus pendientes concretos de validación y dependencia se detallan en la historia, sin reabrir esa decisión.
2. El autorregistro de lavanderías con propietario automático está decidido. Las reglas de estado operativo/visibilidad y las facultades administrativas restantes bloquean el alcance correspondiente de US-002 y US-014.
3. Framework del panel web: bloquea US-014.01 en adelante.
4. Unidades, mínimos, precisión y redondeo del catálogo/peso: bloquea precio final de US-004, US-012 y US-013.
5. Capacidad, simultaneidad, ventanas y reprogramación: bloquea US-008.
6. Zonas, geocodificación, tarifas y ventanas de domicilio: bloquea US-010.
7. Rechazo/no respuesta al ajuste de peso: bloquea US-012.05 y liquidación correspondiente.
8. Proveedor de pagos compatible con split, moneda, comercio responsable, costos, liquidación, precisión/redondeo, tarifas, ajustes y devoluciones: bloquea US-013.02-013.06. La comisión global configurable y el requisito de distribución directa están decididos en [decisiones del modelo comercial](decisiones-modelo-comercial.md); 10%/90% es solo un ejemplo.

## Trazabilidad con requisitos

- US-001–003: RF-09, RF-10, RF-12; RNF-01, RNF-06.
- US-004–005: RF-01, RF-02; RN-01–02.
- US-006–007: RF-03–05; RN-03, RN-05, RN-08–10.
- US-008: RF-06; RN-06.
- US-009–010: RF-07–08; RN-07, RN-11.
- US-012–013: RF-05, RF-11; RN-04, RN-09–10.
- US-014: RF-10; RNF-02, RNF-06.
