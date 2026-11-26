# Acceso, proveedores y usuarios de desarrollo

## Restauración Android confirmada — 2026-11-24

El usuario confirmó «funciona» tras seguir la prueba de ingresar, terminar
completamente la app desde recientes sin pulsar Cerrar sesión y abrirla desde
su icono. La sesión vigente se restaura y permite volver al panel sin pedir
credenciales. Es evidencia manual reportada; no observación directa del agente.
US-001.02 queda hecha en su alcance funcional Android. No se infiere prueba iOS,
restauración con sesión vencida ni otros casos no reportados. iOS queda diferido
hasta disponer del entorno del usuario; dominio/remitente y distribución
conservan sus pendientes. La gestión de otras sesiones pertenece a US-001.05.

Alcance vigente desde el 2026-11-23: correo/contraseña y Google en Android/iOS, con
sesiones opacas comunes y permisos resueltos en API. No se crearon cuentas de
proveedores, dominios, suscripciones, builds remotos ni publicaciones por este trabajo.

Actualización 2026-11-24: el usuario retiró la vinculación de Google a cuentas
existentes. El perfil ya no ofrece cambiar el método y la API retiró las rutas
de vinculación. Se mantienen el ingreso Google, el ingreso por contraseña y las
identidades vinculadas anteriormente. Los apartados fechados el 2026-11-23
conservan su evidencia histórica; no son instrucciones para volver a vincular.

## Prueba real confirmada por el usuario — 2026-11-23

El usuario creó su cuenta Resend, guardó la clave en `.env` y la API fue recreada:
se comprobó presencia de configuración sin mostrar la clave. Después confirmó
en su teléfono el recorrido: registro con correo/contraseña, recepción del código
de Resend, verificación en la app y acceso automático al panel principal.
Es evidencia manual reportada por el usuario, no observación directa del agente.
No se guardan correo personal, contraseña, OTP ni clave API en documentación.

Se usó `onboarding@resend.dev`, limitado al correo asociado a Resend. Falta dominio
y remitente propios para otros destinatarios y para cumplir ese criterio de
US-001.01. Esta prueba no acredita caducidad, reenvío, códigos incorrectos,
ambos sistemas operativos, persistencia tras reabrir ni cierre de sesión.
Google tiene el cliente web configurado y el usuario confirmó crear el cliente
Android con el paquete y SHA-1 del build local. El APK local compiló y se instaló
en Pixel_8a API 36. Se observó selector y consentimiento Google; tras aceptarlo el
usuario, la API reconoció el correo existente y pidió vincular desde el perfil.
Se observó ingreso por contraseña, vinculación confirmada, cierre de sesión y
reingreso con Google hasta «Mi cuenta», sin introducir contraseña. Google iOS no
está configurado. Apple continúa diferido.

## Preparación inicial sin dominio — 2026-11-23

Para recuperar una contraseña existente, usar «Olvidé mi contraseña» o
`http://localhost:8081/recuperar`. El usuario confirmó entrega real del código,
cambio e ingreso al panel con la nueva contraseña en web el 2026-11-23. También
confirmó «Probado y funcionando» al probar el recorrido en Android ese día, y lo
ratificó el 2026-11-24. US-001.03 queda hecha en su alcance funcional web/Android;
no se infiere prueba iOS ni preparación para distribución. Se
revocan todas las sesiones y se exige ingreso posterior. Usa la configuración
Resend existente, sin nuevas variables ni reconstrucción nativa por este cambio.
Ver [US-001.03: contrato, pruebas y pendientes](us-001.03-recuperacion.md).

Estado al iniciar: el usuario dispone de cuenta Google Cloud, todavía no tiene
dominio ni cuenta Resend. La membresía Apple no está confirmada; no se contrató.
El entorno raíz mantiene HMAC, base de datos y contraseña de fixtures existentes.
Se preparó `REGISTRATION_FROM_EMAIL=onboarding@resend.dev` exclusivamente para
pruebas. La variable Apple añadida inicialmente fue retirada al diferir ese acceso.
En ese momento, `RESEND_API_KEY` y los dos IDs Google estaban vacíos. La sección
de prueba real anterior registra la configuración Resend y el resultado posteriores.

1. Crear cuenta en [Resend](https://resend.com/signup) y confirmar el correo.
2. En **API Keys**, crear una clave de envío para desarrollo. Copiarla directamente
   al valor de `RESEND_API_KEY` en `.env` raíz privado, nunca al chat ni al móvil.
3. Mantener el remitente de prueba y usar como destinatario del registro
   **exactamente el correo asociado a la cuenta Resend**. Su dominio de prueba no
   permite entregar a otros usuarios. No usar un fixture ya sembrado para registrar.
4. Abrir Docker Desktop y ejecutar desde la raíz:

   ```powershell
   docker compose config --quiet
   docker compose up -d api mobile
   docker compose up -d --no-deps --force-recreate api
   ```

5. En el teléfono, crear cuenta con ese correo, recibir el OTP y verificarlo;
   comprobar ingreso automático y cierre. Si ya existe esa cuenta, ingresar con
   ella; no borrar cuentas ni cuotas para repetir pruebas.

**Alcance revisado por el usuario el 2026-11-25:** esta prueba real limitada con
Resend y su remitente de prueba es válida para el desarrollo actual del MVP.
El dominio/remitente propio deja de bloquear ese alcance y queda diferido hasta
necesitar otros destinatarios o distribuir el producto. `resend.dev` solo permite
enviar al correo asociado a la cuenta Resend; recibir allí un correo no acredita
entrega a otros usuarios. En esa etapa se sustituirá `REGISTRATION_FROM_EMAIL`
por una dirección del dominio propio verificado, siguiendo la sección Resend.
No se compró dominio ni se cambió configuración por esta decisión.

Se creó `apps/mobile/.env.local` ignorado por Git y por Docker, con solo cuatro
variables públicas: App ID, URL LAN de API y dos IDs Google (todavía vacíos).
Al obtener los IDs, completar ambos archivos según la sección Google.
El `.env` raíz alimenta Compose; el archivo móvil alimenta Expo local fuera de
Docker. Ninguno configura automáticamente el entorno remoto de Expo Build.

Costos consultados el 2026-11-23: Resend Free ofrece 3.000 correos/mes, máximo
100/día. Apple se difirió por presupuesto. Apple Developer Program cuesta USD 99/año o precio local; necesario
para la firma/distribución del build propio para iPhone en este flujo. No hay
una tarifa adicional por cada inicio de sesión Apple. No se aprobó ningún pago.
Fuentes: [límites de Resend](https://resend.com/pricing),
[restricción de pruebas](https://resend.com/docs/knowledge-base/403-error-resend-dev-domain),
[membresía Apple](https://developer.apple.com/programs/enroll/).

Validación local: Compose válido; archivos privados ignorados, entorno móvil
limitado a claves públicas y credenciales previas preservadas. Docker Engine no
estaba disponible al comprobar servicios; no se recrearon contenedores ni se
ejecutaron pruebas de entrega/proveedores en esta preparación.

## Probar ahora sin configurar proveedores

API, PostgreSQL y Metro se ejecutan con Compose. Usar **Ingresar**, no «Crear cuenta»,
para las cuentas ya sembradas. No necesitan enviar OTP porque son fixtures locales.

| Correo ficticio | Rol | Lavandería |
| --- | --- | --- |
| `cliente@example.test` | Cliente | Ninguna |
| `otro-cliente@example.test` | Otro cliente | Ninguna |
| `admin@example.test` | Administrador de plataforma | Ninguna |
| `propietario@example.test` | Propietario | Prueba A |
| `encargado@example.test` | Staff | Prueba A |
| `operario@example.test` | Staff | Prueba A |
| `propietario-b@example.test` | Propietario | Prueba B |

La contraseña común está **solo en `DEV_SEED_PASSWORD` de `.env` privado**. No se
incluye en esta guía, el código ni Obsidian. Cambiar ese valor no cambia contraseñas
ya sembradas: el seed no sobrescribe credenciales. El entorno actual la generó
aleatoriamente; consultarla localmente para introducirla en la app.

Actualización US-003.01, 2026-11-25: los cuatro fixtures OWNER/STAFF tienen tipo de
cuenta de trabajo (`accountKind: LAUNDRY`); el rol de cada lavandería sigue siendo
OWNER o STAFF. Los clientes conservan CUSTOMER y el administrador su rol de
plataforma. No hay cambio de perfil para alternar trabajo/cliente en esa cuenta.
La migración 008 conserva las credenciales y clasifica a los operadores existentes.

Para probar una invitación real, ingresar como propietario y abrir Perfil → Equipo
de mi lavandería. Invitar el correo de una cuenta cliente verificada que pueda
recibir Resend. Con esa misma cuenta, abrir Perfil → Invitaciones de trabajo,
revisar la advertencia y aceptar: se convierte en trabajo exclusivo y cierra sus
sesiones anteriores, sin cambiar correo o contraseña. No usar una cuenta que deba
conservar funciones de cliente. Los correos ficticios `example.test` no acreditan
entrega real. Pasos, contrato y límites en [US-003.01](us-003.01-invitaciones-staff.md).

```powershell
docker compose exec -T api pnpm --dir apps/api db:seed:dev
```

Repetir el comando es seguro: IDs fijos, inserciones idempotentes y transacción.
Requiere `NODE_ENV=development` y `DEV_SEED_ENABLED=true`, además de contraseña
privada de 15–128 caracteres. No corre automáticamente al arrancar ni tiene
endpoint HTTP. No se siembran identidades Google ni tokens que omitan pruebas.
Los fixtures se marcan en SQL y su ingreso/sesiones se deniegan fuera de
`development`/`test`, incluso si quedaron por error en una base de producción.

La pantalla “Mi cuenta” muestra perfil y membresías reales. En desarrollo incluye
acciones para comprobar acceso a plataforma/lavandería contra la API. Catálogo,
pedidos, invitaciones y panel web siguen perteneciendo a sus historias futuras.
Los únicos roles de lavandería aprobados son `OWNER` y `STAFF`; el propietario
invita cuentas individuales como staff. Sus nombres no conceden funciones que
la API todavía no implemente. La migración `007_laundry_membership_roles.sql`
retira `MANAGER` del enum vigente y convierte las membresías existentes de ese
rol a `STAFF`, sin modificar la migración inicial aplicada.

## Sesión de Expo CLI en Docker

La sesión de Expo CLI permite abrir el proyecto con Expo Go; es independiente
del inicio de sesión de los usuarios del marketplace. El volumen local exclusivo
`expo_cli_state`, montado en `/root/.expo` de `mobile`, conserva esta sesión entre
reconstrucciones y recreaciones. Contiene credenciales: no copiarlo al repositorio
ni a la imagen. Se restauró la sesión autorizada desde Windows con permisos
`700` en el directorio y `600` en el archivo, sin montar el perfil del usuario.

Comprobar desde la raíz:

```powershell
docker compose exec -T mobile pnpm exec expo whoami
```

La recreación forzada se comprobó el 2026-11-22 y mantuvo la sesión.
Una sesión revocada o vencida sí requiere ingresar nuevamente por navegador;
el volumen no renueva credenciales. En el teléfono, entrar a Expo Go con la misma
cuenta y abrir el proyecto o escanear su QR.

## Resend: correo de verificación

Resend transporta el correo de OTP. No crea la sesión de Google ni decide roles.

1. Elegir un dominio propio y adquirirlo cuando corresponda; este trabajo no hizo
   ninguna compra. Crear una cuenta en [Resend](https://resend.com/).
2. En **Domains → Add domain**, añadir el dominio o subdominio de envío. Ejemplo
   ilustrativo: `correo.tumarca.com`; no es un dominio configurado.
3. Abrir el administrador DNS del dominio y copiar **exactamente** los registros
   que muestra Resend para SPF/DKIM y el subdominio de envío. No reemplazar registros
   MX del correo existente ni duplicar políticas SPF sin revisar su configuración.
4. Esperar propagación y pulsar **Verify** hasta que el dominio esté verificado.
   Elegir un remitente coherente, por ejemplo `Lavandería <registro@correo.tumarca.com>`.
5. En **API Keys**, crear una clave con permiso **Sending access**, limitada al
   dominio cuando esté disponible. Guardarla únicamente en `.env` privado:

   ```dotenv
   RESEND_API_KEY=<clave-privada-del-servidor>
   REGISTRATION_FROM_EMAIL=Lavandería <registro@correo.tumarca.com>
   ```

6. Mantener estable `REGISTRATION_HMAC_KEY`, ya preparada localmente. Aplicar el
   entorno del servidor, sin reconstruir por un cambio solo de variables:

   ```powershell
   docker compose up -d --no-deps --force-recreate api
   ```

7. Crear una cuenta con un correo propio desde la app. Revisar bandeja y spam,
   introducir OTP y comprobar que entra automáticamente a «Mi cuenta». En Resend,
   comprobar el evento de envío/entrega sin copiar códigos a logs. Probar también
   error, reenvío a 60 segundos, caducidad a 10 minutos y duplicados.

Los reenvíos y fallos inciertos consumen presupuesto. Mantener las cuotas de la API
según el plan de Resend; no confundir número de cuentas con número de correos.
El envío real sigue pendiente hasta completar estos pasos con credenciales propias.

Fuentes: [dominios](https://resend.com/docs/dashboard/domains/introduction),
[claves API](https://resend.com/docs/dashboard/api-keys/introduction).

## Google Cloud Console: Android e iOS

No se usa Firebase. Google acredita identidad; NestJS verifica firma, emisor,
audiencia, vigencia y nonce antes de abrir la sesión local. No se pide acceso a
Gmail, Drive, contactos ni autorización offline.

1. Entrar en [Google Cloud Console](https://console.cloud.google.com/) con tu cuenta
   y crear un proyecto de desarrollo para el marketplace.
2. En **Google Auth Platform → Branding**, configurar nombre visible, correo de
   soporte y contacto. En **Audience**, seleccionar público externo para clientes;
   durante desarrollo mantener el proyecto en pruebas y añadir las cuentas de
   prueba que solicite la consola. Completar **Data Access** con identidad básica
   (`openid`, correo y perfil); no pedir permisos adicionales.
3. Decidir el identificador estable de aplicación. El ejemplo de desarrollo del
   repositorio es `com.lavanderia.marketplace.dev`; no es una marca ni dominio
   reservado. Antes de publicar decidir el identificador de producción y separar
   proyectos/credenciales de desarrollo y producción.
4. En **Clients → Create client → Web application**, crear un cliente para identificar
   al backend. Copiar **Client ID** a `GOOGLE_WEB_CLIENT_ID`. Este flujo nativo
   valida ID tokens: no implementa un callback web y no usa el client secret del
   cliente web. No introducir redirecciones inventadas ni localhost del contenedor.
5. Crear un cliente **iOS** con el Bundle ID exacto del punto 3. Copiar su Client ID
   a `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`. `app.config.ts` deriva el URL scheme inverso
   para volver de Google a la aplicación. No hace falta `GoogleService-Info.plist`
   para esta configuración sin Firebase.
6. Crear un cliente **Android** con el package exacto y **SHA-1 del certificado que
   firma el build instalado**. Obtenerlo de las credenciales Android de Expo Build
   (`pnpm dlx eas-cli@latest credentials --platform android`, desde `apps/mobile`),
   o del keystore que realmente uses. Registrar los certificados adicionales de
   pruebas/producción cuando cambien. Para Google Play, incluir el SHA-1 de **App
   signing** de Play Console, que puede diferir del upload key.
7. En `.env` raíz privado para Compose:

   ```dotenv
   EXPO_PUBLIC_APP_ID=com.lavanderia.marketplace.dev
   GOOGLE_WEB_CLIENT_ID=<client-id-de-tipo-web>
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<client-id-de-tipo-ios>
   ```

8. Recrear API y móvil para que lean esos valores. Compose expone el ID web al
   móvil como `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Para construir fuera de Docker,
   crear `apps/mobile/.env.local` excluido de Git con **solo valores públicos**:

   ```dotenv
   EXPO_PUBLIC_APP_ID=com.lavanderia.marketplace.dev
   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<mismo-client-id-web>
   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<mismo-client-id-ios>
   EXPO_PUBLIC_API_URL=http://<IP-LAN-del-computador>:3000
   ```

   En un build de producción la URL de API debe ser HTTPS. Nunca copiar la clave
   Resend, contraseña del seed, HMAC o credenciales PostgreSQL al entorno público
   del móvil. Usar variables públicas equivalentes en el entorno de Expo Build.
9. Crear e instalar un **development build**, como se indica abajo. Expo Go no
   contiene Nitro Google Sign-In: su botón permanece deshabilitado allí. Probar
   selección de cuenta, cancelación, primer ingreso y reingreso.

Si el correo ya está registrado, la API no fusiona cuentas por coincidencia de
correo: entrar con el método existente. No se permite vincular Google desde
«Mi perfil» ni mediante API. Una identidad Google ya asociada antes del retiro
conserva acceso a su misma cuenta, aunque Google ya no envíe su correo.

Fuentes: [consola de consentimiento](https://developers.google.com/workspace/guides/configure-oauth-consent),
[validación backend](https://developers.google.com/identity/sign-in/android/backend-auth),
[Expo y Google](https://docs.expo.dev/guides/google-authentication/),
[biblioteca y configuración](https://react-native-nitro-google-sign-in.github.io/).

## Apple para iOS: decisión futura

El 2026-11-23 el usuario decidió retirar Sign in with Apple por presupuesto.
No hay botón, vinculación, SDK, capacidad nativa ni configuración de servidor
Apple en el alcance actual. La API solo admite Google como proveedor externo.
No configurar APPLE_BUNDLE_ID ni contratar una membresía por esta entrega.

Para retomarlo se requiere nueva decisión explícita, revisión de costos/firma,
configuración Apple e implementación y pruebas nativas. Antes de publicar en
App Store con Google, revisar la alternativa equivalente que exige la
[sección 4.8 de Apple](https://developer.apple.com/app-store/review/guidelines/#login-services)
y sus excepciones; el correo/contraseña actual no garantiza satisfacerla.
La retirada de Apple tampoco elimina los requisitos de firma/distribución iOS.

## Android Studio: build local y cliente Google de desarrollo

Esta ruta usa el emulador local y no requiere un build remoto ni cuenta de tienda.
El SDK puede seguir en C: y los datos AVD en F: mediante ANDROID_AVD_HOME; esa
variable no mueve imágenes del sistema ni el SDK. Usar una imagen Google Play y
una cuenta de pruebas Google iniciada. Se puede apagar el AVD durante la primera
compilación para liberar RAM; volver a iniciarlo antes de instalar, sin borrar datos.

Configuración comprobada: paquete `com.lavanderia.marketplace.dev`, cliente web
en `.env` y su equivalente público en `apps/mobile/.env.local`. El usuario confirmó
crear el cliente Google Android con ese paquete y el SHA-1 obtenido del keystore
debug generado. La huella es de desarrollo; no sustituye las de firma EAS o Play.

Desde PowerShell, en la raíz, preparar el Android nativo con Expo instalado:

```powershell
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
pnpm --dir apps/mobile exec expo prebuild --platform android --no-install
```

`apps/mobile/android` es salida CNG ignorada por Git: no editarla a mano ni usar
`prebuild --clean` sobre cambios nativos sin revisar. El debug.keystore de esa
carpeta es el que referencia signingConfigs.debug. Para obtener su huella, ejecutar
`./gradlew.bat :app:signingReport` dentro de `apps/mobile/android` con JAVA_HOME y
SDK disponibles; registrar el SHA-1 de debug en Google Auth Platform, cliente
Android, mismo proyecto del cliente web. No se usa el Client ID Android en `.env`.

Para servir API y Metro al Android Emulator, desde la raíz:

```powershell
docker compose -f compose.yaml -f compose.android.yaml up -d api mobile
```

El override usa development client en 8081 y `10.0.2.2` para API/Metro: es el alias
del host visto desde el emulador, no una dirección para iPhone ni navegador Windows.
La API sigue en Docker y lee el ID web desde su entorno de Compose; el móvil recibe solo
su ID público. No ejecutar otro Metro en 8081.

Compilar e instalar en el emulador detectado, desde la raíz:

```powershell
pnpm --dir apps/mobile exec expo run:android --device emulator-5554 --no-bundler --no-install
```

El identificador puede variar: comprobar con adb devices. En equipos de 16 GB,
si Gradle se cierra por falta de memoria nativa, usar el build acotado del proyecto:

```powershell
pnpm --dir apps/mobile android:build:emulator
pnpm --dir apps/mobile exec expo run:android --device emulator-5554 --no-bundler --no-install --binary android/app/build/outputs/apk/debug/app-debug.apk
```

Ese script compila solo x86_64 con dos trabajadores, sin paralelismo entre
proyectos, JVM de 1536 MiB y compilador Kotlin en proceso. No modifica Gradle
generado ni las opciones globales de otros proyectos. Conserva cachés/descargas.
Instalar **CMake 3.31.6** en Android Studio → Settings → Languages & Frameworks →
Android SDK → SDK Tools → Show Package Details → CMake. El script selecciona esa
versión para todos los módulos; incluye Ninja 1.12.1. CMake 3.22.1 / Ninja 1.10.2
falló al crear rutas largas de Reanimated en Windows, incluso con LongPathsEnabled.
No hace falta reinstalar Android Studio ni mover el repositorio por ese error.
Referencia: [Reanimated en Windows](https://docs.swmansion.com/react-native-reanimated/docs/guides/building-on-windows/).
El proyecto actual
requiere compile SDK 37, Build Tools 37.0.0 y NDK 27.1.12297006; el emulador API 36
puede ejecutarlo. La primera compilación descarga herramientas y dependencias.
El prebuild actualiza scripts android/ios a run:android/run:ios. Android e iOS
generados se excluyen del contexto Docker para evitar incluir keystores/cachés.

Para volver a Expo Go y teléfono físico:

```powershell
docker compose up -d --no-deps --force-recreate mobile
```

Fuente de red: [alias del emulador](https://developer.android.com/studio/run/emulator-networking-address).
Firma y cliente creados no prueban por sí solos el ingreso Google real. La
validación del APK, instalación y acceso debe registrarse con su resultado observado.
Google iOS permanece pendiente; no se infiere de Android.

Evidencia local del 2026-11-23: `android:build:emulator` terminó **BUILD SUCCESSFUL**
en 6 min 38 s; APK debug x86_64 de 95,2 MiB, certificado SHA-1 idéntico al debug
registrado. Instalación con Expo CLI `--binary` y carga Android desde Metro
completadas. El primer arranque tardó hasta mostrar «Ingresar», con botón nativo
Google habilitado. Selector y consentimiento funcionaron; el usuario aceptó y
se observó el rechazo esperado de correo existente, sin fusión automática.
El usuario ingresó por contraseña y completó la vinculación; se observó «Método
de acceso vinculado a tu cuenta». Después se comprobó cierre de sesión, regreso
a «Ingresar», selección de cuenta Google y acceso a «Mi cuenta» con rol Cliente,
sin introducir contraseña. La app queda abierta con esa sesión Google.

Docker móvil reconstruido y recreado con la configuración Android; lint, tipos,
sintaxis del script y Compose config aprobados. No se repitieron las pruebas API,
pues no cambió su código. Pendientes: primer registro con una identidad Google
nueva, cancelación, restauración tras terminar el proceso, accesibilidad y Google
iOS. Esta evidencia corresponde al emulador Android local, no a un teléfono iOS
ni a una publicación en tiendas.

## Development builds y Metro

### Repetir el trabajo diario en el emulador

Desde PowerShell en la raíz, dejar una terminal con sincronización activa:

```powershell
docker compose -f compose.yaml -f compose.android.yaml up --build --watch
```

Este comando conserva API y Metro en Docker y sincroniza las rutas declaradas en
`develop.watch`. Un simple `up -d` no inicia Watch; sin sincronización, guardar
archivos locales no actualiza por sí solo el código dentro del contenedor.
Para pantallas, estilos y lógica TypeScript/JavaScript, normalmente basta con
Fast Refresh o Reload en el cliente de desarrollo. No recompilar APK por rutina.

Para cambios nativos, bibliotecas nativas o configuración nativa, usar otra
terminal PowerShell en la raíz. Si cambió el lockfile, sincronizar primero las
dependencias Windows con `pnpm install --frozen-lockfile`. Regenerar mediante
`pnpm --dir apps/mobile exec expo prebuild --platform android --no-install`
cuando cambien plugins/configuración nativa o se añada una biblioteca nativa;
después ejecutar `pnpm --dir apps/mobile android:build:emulator` y el comando
`expo run:android --binary` de la sección anterior. Conservar el paquete y el
keystore para actualizar la instalación y mantener válida su huella Google.
Los cambios de dependencias/configuración fuera de Watch también requieren
reconstruir los servicios Docker afectados y reiniciar Watch.

El APK es un development build x86_64 para el emulador: necesita Metro activo
para cargar el código durante desarrollo. No es un APK de distribución autónomo.
Esta explicación se contrastó con Compose y el script existentes; no se ejecutó
otra compilación ni se inició Watch al documentarla.

Desde `apps/mobile`, una vez configurados los IDs públicos y tu proyecto Expo:

```powershell
pnpm dlx eas-cli@latest build:configure
pnpm dlx eas-cli@latest build --platform android --profile development
pnpm dlx eas-cli@latest build --platform ios --profile development
```

Son instrucciones para ejecutar con tus cuentas y revisar firma/cupos; no se
ejecutaron builds remotos en esta tarea. `eas.json` incluye perfiles de desarrollo,
simulador iOS y producción. Configurar proyecto/entorno Expo y permisos Apple al
seguir los asistentes; conservar los IDs del proyecto que generen, sin versionar
credenciales privadas.

Antes del build remoto, en el proyecto de [Expo](https://expo.dev/), abrir
**Environment variables** y añadir con visibilidad **Plain text**, ámbito del
proyecto y entorno **development**, los cuatro valores públicos de
`apps/mobile/.env.local`: `EXPO_PUBLIC_APP_ID`, `EXPO_PUBLIC_API_URL`,
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
La URL LAN solo funcionará con teléfono y API en la misma red. No subir el
`.env` del servidor ni añadir claves Resend/HMAC/contraseñas a Expo.
El perfil `development` tiene `developmentClient: true`, por lo que Expo selecciona
el entorno development; comprobarlo antes de construir. Tras `build:configure`,
conservar la asociación real `extra.eas.projectId` que genere el asistente.
Obtener primero la firma Android con `credentials --platform android`, registrar
su SHA-1 en el cliente Google Android y construir después con los IDs completos.
Guías oficiales: [variables de Expo](https://docs.expo.dev/eas/environment-variables/manage/)
y [entorno del build](https://docs.expo.dev/eas/environment-variables/usage/).

Compose conserva `--go` para seguir probando correo/fixtures con Expo Go. Para
arrancar el mismo servicio en modo development client, conservar sus variables
Compose y cambiar únicamente el comando (desde la raíz):

```powershell
docker compose stop mobile
docker compose run --rm --service-ports mobile pnpm exec expo start --dev-client --lan --port 8081
```

Escanear el QR con la app de desarrollo instalada. Al terminar ese proceso, volver
al servicio normal con `docker compose up -d mobile`. No ejecutar dos Metro en
8081. Google es nativo; la vista web complementaria ofrece correo.

## Contratos y límites de esta entrega

| Endpoint | Acceso / efecto |
| --- | --- |
| `POST /auth/login` | Público; correo/contraseña; sesión opaca |
| `POST /auth/registrations/verify` | Público; OTP; cuenta y sesión en una transacción |
| `POST /auth/providers/challenge` | Público; `provider: google`; nonce de 5 minutos |
| `POST /auth/providers/login` | Público; `provider`, `challengeId`, `identityToken`; crea CUSTOMER o ingresa |
| `GET /auth/me` | Bearer; perfil y membresías actuales |
| `POST /auth/logout` | Bearer; revocación inmediata; HTTP 204 |
| `GET /platform/access` | Solo PLATFORM_ADMIN |
| `GET /laundries/:id/access` | Solo membresía de esa lavandería; admin no implica membresía |

Todas las demás rutas requieren sesión salvo marca pública explícita. El móvil
guarda el token en SecureStore nativo; web lo mantiene solo en memoria y pide
ingreso al recargar. Cierre de sesión necesita confirmación del servidor; ante
fallo de red conserva una sesión con la que se puede reintentar. Duración absoluta
7 días, sin renovación deslizante. Las rutas antiguas de vinculación
`/auth/identities/challenge` y `/auth/identities/link` están retiradas (404).
Los desafíos de ingreso son de un solo uso, cinco intentos máximos y nonce
verificado; la clave de proveedor es `(provider, sub)`, nunca el correo.

Ingreso y desafíos tienen cuota inicial de 50 solicitudes/IP/15 minutos; ingreso
por contraseña además 10/correo/15 minutos. Reservas persistentes antes de hash o
verificación; errores no incluyen pruebas de identidad ni detalles de SQL/proveedor.
No borrar cuotas para repetir pruebas manuales: usar bases temporales automatizadas.

Migración nueva `003_sessions_and_federated_identity.sql`, sin modificar 001/002.
Recuperación, gestión de dispositivos, eliminación de cuenta, invitaciones y matriz
comercial completa de permisos siguen pendientes de sus historias. Esta base no
implementa pantallas de catálogo, pedidos, pagos ni administración web.

## Validación del retiro de Apple — 2026-11-23

- Retirados botón, vinculación, SDK, plugin y capacidad Apple del móvil; dependencia
  eliminada del manifiesto y lockfile mediante pnpm. Retirada la variable Apple
  del entorno privado, ejemplo y Compose. Conservadas credenciales existentes.
- API solo admite Google; las cuatro rutas de desafíos/ingreso/vinculación rechazan
  Apple y proveedores desconocidos con HTTP 400, sin crear desafíos.
- API lint/build, 6 unitarias y 26 e2e aprobadas en Docker con PostgreSQL 17
  temporal: 12 registro, 10 sesiones/identidades/permisos, 3 criptografía y 1 base.
  Se conservan pruebas de nonce, expiración, límites, replay y vinculación Google.
- Móvil lint/tipos y exportación web/bundles JavaScript Android/iOS aprobados.
  Configuración Expo resuelta sin plugin ni capacidad Apple. No es un build
  nativo firmado ni una prueba visual en dispositivo.
- Servicios reconstruidos; API real rechaza Apple. Fixture existente completa
  ingreso por correo, consulta perfil y cierre; Expo CLI mantiene su sesión.
- Migración 003 y datos preservados. Sus restricciones históricas permiten el
  valor Apple, pero ninguna ruta actual lo admite; no se reescribe SQL aplicado.
- Pendientes de cierre: Resend/dominio/entrega y Google configurado con pruebas
  nativas. Apple queda como decisión futura y no bloquea US-001.01/.02/.07.

## Validación histórica — 2026-11-22

- API lint/build y 6 unitarias aprobadas en Docker. Las 26 e2e históricas, anteriores al retiro de Apple, pasaron con
  PostgreSQL 17 temporal: 12 de registro, 9 de sesiones/identidades/roles, 4 de
  firma/claims con claves de prueba y el saludo inicial. Bases temporales eliminadas.
- Móvil lint/tipos aprobados y exportaciones web y bundles JavaScript Android/iOS
  generados. No se compiló un binario nativo firmado ni se ejecutó un build remoto.
- Siete cuentas sembradas: ingreso/perfil/cierre comprobados en API real. Repetición
  del seed conserva hashes; ejecución con `NODE_ENV=production` rechazada.
- Interfaz web: propietario de prueba ve lavandería A, confirma acceso con API y
  cierra sesión. Evidencia `artifacts/acceso-propietario-prueba.jpg`; no acredita
  pruebas físicas de Google ni todas las pantallas nativas.
- Sesión Expo local restaurada según autorización previa del usuario tras recrear
  el contenedor; no se copiaron secretos a la imagen ni al repositorio.
- Pendientes: dominio/remitente/entrega Resend, clientes OAuth Google, firma/builds y acceso real en Android/iOS. No se declaran
  historias de proveedores o registro externo cerradas por pruebas simuladas.
