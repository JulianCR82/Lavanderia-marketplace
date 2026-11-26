# Decisiones oficiales de autenticación

**Aprobadas por el usuario: 2026-11-22.** Aplican a EP-01 (US-001).
Son requisitos de desarrollo; su aprobación no significa implementación ni
contratación de servicios. El backlog conserva los IDs y dependencias originales.

## Decisión vigente: no vincular nuevos métodos de acceso — 2026-11-24

El usuario retiró el cambio de correo/contraseña a Google desde el perfil. Se
eliminan los controles de vinculación y los endpoints `POST /auth/identities/challenge`
y `POST /auth/identities/link`; no basta ocultarlos en el cliente. No se crean
nuevas vinculaciones a cuentas existentes. Si una identidad Google nueva presenta
un correo ya registrado, se rechaza con `ACCOUNT_SIGN_IN_METHOD_MISMATCH` y se
indica ingresar con el método original, sin ofrecer vinculación ni fusionar cuentas.

El registro/ingreso Google y el ingreso por contraseña permanecen disponibles.
Se conservan las identidades ya existentes y sus accesos; no se borran credenciales
ni se modifica el esquema histórico. Los desafíos antiguos ligados a una cuenta
no sirven para el ingreso Google público. Esta decisión sustituye las reglas de
vinculación conservadas abajo como historial, sin cambiar recuperación o Apple.

## Decisión vigente: Apple diferido — 2026-11-23

El usuario pidió retirar Sign in with Apple por falta de presupuesto. El alcance
actual es correo/contraseña con OTP vía Resend y Google en Android/iOS; Apple queda
como decisión futura, sin bloquear US-001.01/.02/.07. Esta decisión sustituye la
parte de Apple de la ampliación del 2026-11-22 conservada abajo como historial.

Retirar botón, vinculación, dependencia, capacidad nativa, variable de servidor
y aceptación del proveedor Apple en API. Conservar cuentas y migraciones ya
aplicadas: que el esquema histórico admita ese valor no habilita el acceso.
Retomarlo requiere decisión explícita, presupuesto, configuración y pruebas.

Antes de publicar en App Store con Google, revisar la alternativa equivalente
de acceso y las excepciones de la
[sección 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services).
No se declara que correo/contraseña sustituya ese requisito. La membresía/firma
para distribuir una app iOS propia es independiente de retirar este proveedor.

## Historial: ampliación correo, Google y Apple — 2026-11-22

El usuario aprobó implementar correo/contraseña, Google y Apple para iOS, además
de usuarios de prueba sembrados y guía de configuración de proveedores. Resuelve
la revisión histórica siguiente: Google complementa el correo; no lo sustituye.

- Google en Android/iOS y Apple en iOS acreditan identidad con tokens verificados
  por NestJS: firma RS256 con JWKS confiable, emisor, audiencia configurada, vigencia
  y nonce. Se usa `(provider, sub)` como identidad estable; no fusionar por correo.
- Cuenta pública nueva siempre CUSTOMER sin membresías. Un proveedor se vincula a
  una cuenta existente solo con sesión reciente de menos de 15 minutos y prueba
  nueva del proveedor ligada a esa cuenta. No mover identidades entre cuentas.
- Todos los métodos, incluido OTP de correo verificado, abren las mismas sesiones
  opacas de 7 días absolutos. No hay renovación deslizante en esta entrega. Cierre
  revoca inmediatamente; almacenamiento nativo SecureStore, web solo memoria.
- Desafío federado: cinco minutos, cinco intentos, nonce y consumo único. Límite
  inicial persistente de 50 solicitudes/IP/15 minutos para ingreso/desafíos y
  10/correo/15 minutos para contraseña, reservados antes de trabajo criptográfico.
- Rutas autenticadas por defecto, excepciones públicas explícitas. Perfil y
  membresías se resuelven de datos actuales. Los contratos mínimos de acceso a
  plataforma/lavandería no implementan todavía catálogo, pedidos ni sus permisos.
- Fixtures: siete cuentas y dos lavanderías, seed explícito solo en desarrollo,
  idempotente, contraseña privada en entorno y rechazo de fixtures en producción.
  Ninguna cuenta Google/Apple ni código de acceso fijo se siembra.
- El acceso Google nativo requiere development build; Expo Go sigue sirviendo
  correo/fixtures. Configuración nativa y perfiles Expo preparados; entrega real,
  configuración de proveedores y builds Android/iOS siguen por verificar.

Implementación y operación: [guía de proveedores y pruebas](configuracion-acceso-y-pruebas.md).
Se conservaron migraciones previas y cuentas existentes; nueva migración 003.

## Revisión solicitada: acceso con Google — 2026-11-22

Registro histórico previo a la ampliación aprobada arriba; sus pendientes de
selección ya quedaron resueltos por el usuario.

El usuario confirmó que la app abre en su iPhone mediante Expo Go y expresó que
quiere inicio de sesión con Google para los usuarios del marketplace, con funciones
por rol. No tiene aún dominio propio y solicitó una explicación y pasos. Esto
plantea revisar el diseño anterior de correo/contraseña; no se implementó Google
ni se completaron sesiones o permisos por esta solicitud de orientación.

Pendiente concretar si Google reemplaza el registro con contraseña o se añade como
alternativa. Hasta definirlo, los criterios de correo/OTP siguientes describen el
alcance anterior y el código existente; no deben tratarse como confirmación de que
el nuevo deseo queda satisfecho. No eliminar cuentas, credenciales ni migraciones
aplicadas. Revisar US-001.01/US-001.02 antes de cambiar la implementación y conservar
los IDs. La autorización por rol y membresía sigue en US-001.06/EP-03.

Separación propuesta: Google acredita identidad; NestJS valida la prueba de Google,
vincula un identificador estable del proveedor a la cuenta local y emite la sesión
opaca ya acordada. Roles/membresías siguen bajo control del backend. Registro
público inicia como CUSTOMER, sin acceso administrativo ni membresías concedidas
por el propio cliente. La matriz detallada de permisos sigue por concretar.

Resend es transporte de correos transaccionales. Un acceso federado Google puede
diseñarse sin OTP propio de registro; eso permite posponer su configuración para
ese recorrido. No supone eliminar futuras necesidades de correo ni cerrar la HU
actual sin revisar criterios. No se compró dominio ni configuró Google Cloud.

Fuentes oficiales consultadas: [Expo: Google](https://docs.expo.dev/guides/google-authentication/)
requiere development build para sus integraciones nativas, no Expo Go;
[Google: validación en backend](https://developers.google.com/identity/sign-in/android/backend-auth)
exige validar la identidad en servidor;
[Apple, sección 4.8](https://developer.apple.com/app-store/review/guidelines/#login-services)
requiere alternativa equivalente de acceso salvo excepciones. Prever Sign in with
Apple para iOS es una recomendación de diseño, todavía no implementada ni aprobada
como alcance adicional.

## Registro — US-001.01

- Cuentas y sesiones propias en la API NestJS. Correo/contraseña convive con Google;
  Apple queda diferido según la decisión del 2026-11-23. No se solicita teléfono.
- Validar y normalizar el correo de forma consistente con su unicidad en base
  de datos. El registro informa explícitamente que un correo ya está registrado;
  se acepta que esta respuesta permite enumerar cuentas. Recuperación mantiene
  una respuesta genérica.
- En el registro por correo, verificar OTP de 6 dígitos antes de crear `accounts`.
  El registro temporal queda separado de las cuentas. Un fallo o abandono de la
  verificación no crea cuenta.
- El OTP expira a los 10 minutos y solo se usa una vez. Permitir como máximo
  5 intentos incorrectos por proceso de verificación. Un reenvío genera un código
  nuevo e invalida el anterior, sin reiniciar el contador de fallos del proceso.
- Esperar 60 segundos entre envíos. Máximo 5 envíos por correo por hora, incluido
  el inicial, y 30 por IP por hora como límite inicial configurable. Reiniciar
  el registro no elude las cuotas acumuladas por contacto/IP. Controlar también
  el presupuesto global de envío según el plan del proveedor. Estos límites no
  bloquean permanentemente cuentas ni el ingreso de usuarios existentes.
- Proteger el OTP con HMAC y clave del servidor, vinculado al desafío, propósito
  y registro correspondiente. No persistir ni registrar el OTP en claro.
- Contraseña de 15 a 128 caracteres, con espacios y Unicode, sin composición
  obligatoria de mayúsculas, números o símbolos. Permitir pegar, autocompletar y
  gestores; ofrecer mostrar/ocultar. Rechazar contraseñas comunes o comprometidas,
  con comprobación local inicial; nunca enviar la contraseña completa a terceros.
  No exigir cambios periódicos sin motivo. La verificación al registrarse no
  equivale a MFA en los ingresos posteriores.
- Almacenar contraseñas únicamente como hash Argon2id. Partir como mínimo de
  19 MiB, 2 iteraciones y paralelismo 1; medir costo en Docker antes de fijar los
  parámetros definitivos. Nunca persistir contraseñas en claro, tampoco en el
  registro temporal, respuestas o logs.
- Consumir la prueba y crear cuenta/credencial de forma atómica, con protección
  contra concurrencia y reintentos. Vincular la prueba al registro previsto;
  otro intento no puede sustituir las credenciales de un flujo verificado.
  Usar una conexión dedicada para transacciones con `pg`; llamadas independientes
  a `pool.query` no garantizan una misma conexión.
- El registro público fuerza `CUSTOMER`, sin membresías ni privilegios de
  administrador. Extender el esquema mediante una migración nueva, sin editar
  `001_initial.sql`.

## Correo transaccional

- Proveedor seleccionado: **Resend**, inicialmente plan gratuito para desarrollo
  y piloto, con seguimiento del consumo. Las cuotas se comparten entre códigos,
  reenvíos y futura recuperación; no equivalen al número de registros.
- **Decisión del usuario 2026-11-25:** durante el desarrollo del MVP se mantiene
  Resend con el remitente de prueba `onboarding@resend.dev`. Configurar dominio y
  remitente propios queda diferido y deja de bloquear el alcance de desarrollo.
- El remitente de prueba solo permite enviar al correo asociado a la cuenta de
  Resend. Antes de admitir otros destinatarios, piloto abierto o distribución,
  configurar un dominio propio verificado y un remitente del marketplace común
  para las lavanderías. Es un pendiente operativo de esa etapa, no un cambio de
  proveedor ni una autorización para comprar dominio o contratar un plan.
  [Restricción oficial del dominio de prueba](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain).
- Mantener el envío detrás de un adaptador para cambiar transporte sin modificar
  las reglas de cuentas. En pruebas usar un transporte de prueba; la aceptación
  de la integración requiere comprobar entrega real. No mostrar códigos en logs
  como sustituto de un transporte de prueba.
- No se aprueba una suscripción pagada ni se presupone volumen suficiente para
  el lanzamiento; revisar consumo y condiciones antes de ampliar el plan.

## Sesiones e ingreso automático — US-001.02 y US-001.05

Actualización aprobada 2026-11-24: se implementa la gestión de sesiones propias,
con consulta paginada, plataforma genérica informativa, revocación seleccionada
y actual, auditoría transaccional e interfaz conforme al nuevo diseño global.
Se mantienen siete días absolutos y almacenamiento seguro; no se añaden datos
de ubicación, huellas ni renovación. Detalles, evidencia y prueba Android pendiente
en [US-001.05](us-001.05-sesiones.md). La revocación bloquea nuevas autorizaciones,
no cancela operaciones ya autorizadas. La aprobación no acredita validación nativa.

- Sesiones opacas en servidor, token aleatorio almacenado como hash en PostgreSQL
  y guardado en el móvil mediante almacenamiento seguro. Duración inicial: 7 días.
- La API verifica vigencia y revocación y resuelve identidad/roles/membresías desde
  datos confiables; logout y revocación invalidan inmediatamente la sesión.
  No sustituir por JWT por una posibilidad futura de microservicios.
- Experiencia final aprobada: ingreso automático después del registro verificado,
  usando el mismo mecanismo de sesiones de US-001.02, sin volver a pedir contraseña.
- US-001.02 ya conecta el ingreso automático tras OTP con el mismo mecanismo de
  sesiones de correo/proveedores. US-001.01 y US-001.02 se desarrollan conjuntamente
  por este encargo ampliado; no se marcan hechas sin validación externa/nativa.
- Confirmación posterior 2026-11-24: el usuario validó restauración al terminar
  y reabrir la app sin logout en Android. Con las evidencias API y de ingreso/cierre
  existentes se cierra US-001.02 en su alcance funcional Android. iOS se difiere
  hasta disponer del entorno; el dominio/remitente de US-001.01 sigue pendiente
  para distribución. No se infieren pruebas manuales adicionales.
- Renovación, inactividad y detalles de gestión de dispositivos se concretarán
  al abordar las historias correspondientes; no bloquean iniciar US-001.01.

## Recuperación — US-001.03: plan aprobado el 2026-11-23

El usuario aprobó expresamente implementar el plan completo de recuperación.
Estas decisiones resuelven los pendientes específicos de esta historia:

- Correo vía Resend y respuesta genérica para cuentas con contraseña, contactos
  inexistentes y cuentas que solo usan Google. No crear contraseña para estas últimas.
- OTP de seis dígitos: proceso de diez minutos desde la primera solicitud,
  cinco fallos máximos, reenvío tras sesenta segundos. Reenviar o reiniciar dentro
  del proceso no reinicia fallos ni amplía su vigencia. Cada código sustituye al anterior.
- Compartir cuotas persistentes por correo, IP y presupuesto global con registro;
  reservar también para contactos no elegibles para evitar enumeración por cuotas.
- Al verificar el OTP, emitir una autorización aleatoria de cinco minutos, de un
  solo uso y propósito, conservada solo en memoria del cliente. No es una sesión.
- Contraseña nueva y confirmación, con la política Argon2id/15–128 caracteres
  vigente. Cambio, consumo de prueba, auditoría y revocación de todas las sesiones
  son atómicos. Exigir ingreso posterior; no iniciar sesión automáticamente.
- Enviar aviso de cambio de contraseña, con reintento persistente limitado por
  cuotas. Nunca incluir contraseña, código ni autorización de restablecimiento.
- Sin acceso al correo: usar un proveedor previamente vinculado o recuperar el
  correo con su proveedor. No habilitar una vía de soporte que evada esa prueba.

Implementación, contrato y evidencia: [recuperación de acceso](us-001.03-recuperacion.md).
El usuario confirmó recepción del código, cambio e ingreso con la nueva contraseña
en web y el recorrido funcional Android el 2026-11-23. Ratificó la prueba Android
el 2026-11-24; se concilió el backlog y US-001.03 queda hecha en su alcance funcional
web/Android. Es evidencia manual reportada; iOS, dominio propio y distribución
siguen pendientes. No se cierra US-001.01 ni se acredita preparación para producción.

## Conversión exclusiva de cliente a trabajo — Decisión del 2026-11-25

La decisión vigente sustituye cuentas/correos separados: la cuenta cliente se
convierte en cuenta de trabajo al aceptar expresamente una invitación STAFF.
Conserva identidad, correo y credencial; pierde funciones de cliente y sus sesiones
anteriores se revocan. El vínculo STAFF, consumo, auditoría y nueva sesión de
trabajo se confirman en una transacción. No hay retorno automático a cliente.
OWNER/STAFF siguen siendo roles por lavandería; account_kind CUSTOMER/LAUNDRY
clasifica el uso de la cuenta y platform_role mantiene el contrato histórico.
Los endpoints de cliente deben exigir RequireCustomerAccount en backend.

La migración 008 clasifica los operadores existentes y preserva sus datos y
credenciales. No modifica migraciones aplicadas ni la elección de Google,
Resend, Argon2id o sesiones opacas. Registro, ingreso y recuperación conservan
la misma cuenta; no crean un duplicado al incorporarse como staff. Detalles y
límites de evidencia en [US-003.01](us-003.01-invitaciones-staff.md).

## Perfil y autorización — US-001.04 y US-001.06

Decisión del usuario del 2026-11-24: US-001.04 permite editar únicamente un nombre
para mostrar opcional; el correo es de solo lectura y se retira su cambio de esta
historia. Roles y membresías son informativos y de solo lectura en el perfil.
Decisión ratificada el 2026-11-25: los únicos roles de lavandería aprobados son `OWNER` y
`STAFF`; el propietario se crea con el autorregistro y puede invitar cuentas
individuales como staff. Ver [modelo comercial y roles](decisiones-modelo-comercial.md).
Una futura edición de correo requeriría definir y verificar el nuevo contacto,
pero no se implementa aquí.
La autorización se aplica en servidor por rol, membresía y recurso, con denegación
por defecto. El desarrollo de perfil se autorizó con la base de sesión existente;
US-001.02 conserva sus validaciones pendientes, sin declararla hecha por este encargo.

## Estado y referencias

US-001.01 está en curso: API, migración y flujo móvil implementados. El
[contrato técnico](us-001.01-registro.md) concreta HTTP, retención por actividad,
parámetros iniciales y validaciones ejecutadas. Docker, PostgreSQL 17 y costo
Argon2id ya comprobados; faltan entrega real con Resend/dominio y dispositivos Android/iOS.
Estos pendientes no reabren la selección de autenticación ni implican que las
demás historias estén hechas.

- [Historias y criterios](historias-usuario.md)
- [Requisitos](requisitos.md)
- [Resend: integración Node](https://resend.com/docs/send-with-nodejs)
- [Resend: dominios](https://resend.com/docs/dashboard/domains/introduction)
- [OWASP: autenticación](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [OWASP: contraseñas](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
