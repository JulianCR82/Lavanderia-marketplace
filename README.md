# Lavandería Marketplace

Marketplace familiar de lavanderías para Bogotá. El objetivo es comparar
lavanderías y servicios, solicitar pedidos, elegir entrega en establecimiento o
domicilio y pagar en la plataforma. Cada lavandería administrará su catálogo y
pedidos; habrá un administrador de plataforma. Se comenzará con la lavandería
familiar, manteniendo datos y permisos separados para múltiples lavanderías
independientes desde el inicio.

## Estructura y tecnologías

| Ruta | Contenido |
| --- | --- |
| `apps/api` | API NestJS 11 y TypeScript |
| `apps/mobile` | React Native, Expo SDK 58, TypeScript y Expo Router |
| `compose.yaml` | PostgreSQL 17, API, Expo y reglas de Compose Watch |
| `Dockerfile.dev` | Imagen de desarrollo: Node 24.14.0 y pnpm 12.21.0 |
| `pnpm-workspace.yaml` | Monorepo pnpm con aplicaciones en `apps/*` |

Las instrucciones para colaboradores están en [AGENTS.md](AGENTS.md) y las
específicas de móvil en [apps/mobile/AGENTS.md](apps/mobile/AGENTS.md). Los
perfiles de rol están en `docs/agents/`; las skills del proyecto para tareas de
API, móvil, datos, seguridad y pagos están en `.agents/skills/`.
La paleta y sus usos están en [docs/brand.md](docs/brand.md). El diseño sigue
[expo-design-system](.agents/skills/expo-design-system/SKILL.md), conservando la
estructura de Expo y adaptando únicamente su apartado de colores al producto.

Expo está instalado como plugin personal de Codex con
`codex plugin add expo@openai-curated` y como skills del proyecto para OpenCode con
`npx skills add expo/skills --agent opencode --yes`. Las versiones de origen de
estas últimas están en `skills-lock.json`. La adaptación de colores vive en
`.agents/skills/expo-design-system/SKILL.md`: revisar y conservar ese apartado al
actualizar o reinstalar las skills, porque el instalador puede reemplazarlo.
Se versionan las cinco skills propias `marketplace-*` y la adaptación de
`expo-design-system`. Las demás skills genéricas Expo/EAS se instalan localmente
y están excluidas mediante `.gitignore`; `skills-lock.json` conserva su procedencia
y revisión. En un checkout nuevo, preparar esas skills antes de seguir las
instrucciones especializadas que las referencian. No son dependencias de ejecución
de la API o del móvil.
La instalación no sustituye los comandos pnpm ni las instrucciones locales de
SDK, negocio y seguridad.
El backlog funcional ordenado, con identificadores y criterios de aceptación,
está en [docs/historias-usuario.md](docs/historias-usuario.md).

## Preparación en Windows 11

1. Instalar y abrir Docker Desktop con el motor de contenedores Linux.
2. Verificar `docker compose version`. Se necesita soporte para Watch con
   `initial_sync`.
3. Desde la raíz, copiar la plantilla **solo si no existe `.env`**:

   ```powershell
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   ```

4. Editar `.env`: definir `POSTGRES_DB`, `POSTGRES_USER`, una clave local propia
   en `POSTGRES_PASSWORD`, `POSTGRES_PORT` (por defecto `15432`) y `DEV_HOST_IP`.
   No compartir ni versionar `.env`.

La imagen instala las dependencias con `pnpm install --frozen-lockfile`. No se
requiere Node ni pnpm en Windows para ejecutar este flujo Docker. Si se usan
herramientas directamente en el host, respetar la versión pnpm 12.21.0.

### IP local y acceso desde el teléfono

Ejecutar `ipconfig` en PowerShell y tomar la IPv4 del adaptador Wi-Fi o Ethernet
conectado a la red del teléfono. No usar `localhost`, la IP del contenedor ni un
adaptador virtual de Docker o VPN. Configurar, por ejemplo:

```dotenv
DEV_HOST_IP=192.168.1.50
```

Es una dirección de ejemplo; reemplazarla por la del equipo. El teléfono y el PC
deben poder comunicarse en la misma red. Permitir acceso a los puertos TCP
`8081` y `3000` en el firewall de Windows para la red privada de desarrollo.
Verificar que la red no aísle los dispositivos y que una VPN no bloquee el acceso.

Compose publica Expo en `8081` y define:

- `EXPO_PACKAGER_PROXY_URL=http://<DEV_HOST_IP>:8081`: dirección anunciada por Expo.
- `EXPO_PUBLIC_API_URL=http://<DEV_HOST_IP>:3000`: URL pública para futuras
  peticiones del cliente. La aplicación aún no la utiliza para consumir la API.

Las variables `EXPO_PUBLIC_*` son visibles en el cliente y nunca deben contener
secretos. Si cambia la IP, actualizar `.env` y recrear `mobile` para que tome las
nuevas variables; reiniciar Watch después.

## Iniciar y observar el entorno

Desde la raíz:

```powershell
docker compose config --quiet
docker compose up --build --watch
```

El primer comando valida la configuración sin imprimir los valores resueltos.
El segundo construye la imagen, inicia los tres servicios y mantiene Watch en
primer plano. La API espera a que PostgreSQL esté saludable; esto **no significa**
que NestJS ya tenga una conexión a la base de datos.

En otra terminal se pueden consultar estado y logs:

```powershell
docker compose ps
docker compose logs --tail 100 api mobile
```

Abrir en el teléfono el enlace o QR anunciado por Expo con un cliente compatible
con SDK 58. Si no se ve el QR en los logs combinados, consultar los logs de
`mobile`. La compatibilidad del cliente debe verificarse en el dispositivo.

### Compose Watch

| Archivos locales | Destino en el contenedor | Comportamiento |
| --- | --- | --- |
| `apps/api/src` | `/workspace/apps/api/src` | Sincronización; Nest observa y recompila |
| `apps/mobile/src` | `/workspace/apps/mobile/src` | Sincronización; Expo procesa los cambios |
| `apps/mobile/assets` | `/workspace/apps/mobile/assets` | Sincronización de recursos para Expo |

Las tres reglas incluyen sincronización inicial. Editar los archivos en Windows;
Watch los copia al contenedor. No hay un montaje de todo el repositorio.

Los cambios en `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`,
`app.json`, archivos TypeScript de configuración, `Dockerfile.dev` y demás rutas
fuera de la tabla no se sincronizan automáticamente. Tras actualizar dependencias
con pnpm y guardar manifiestos/lockfile en el repositorio, detener Watch con
`Ctrl+C`, reconstruir y recrear los servicios afectados y volver a activar Watch:

```powershell
docker compose up -d --build --force-recreate api mobile
docker compose watch
```

El mismo reinicio aplica a cambios de `.env` o de la configuración de los
servicios; para un cambio solo de IP basta con recrear `mobile`:

```powershell
docker compose up -d --force-recreate mobile
docker compose watch
```

### Direcciones y base de datos

| Acceso | Dirección |
| --- | --- |
| API desde Windows | `http://localhost:3000` (GET `/` devuelve `Hello World!`) |
| API desde el teléfono | `http://<DEV_HOST_IP>:3000` |
| Expo desde la red local | `http://<DEV_HOST_IP>:8081` |
| PostgreSQL desde Windows | `127.0.0.1:15432` o el valor de `POSTGRES_PORT` |
| PostgreSQL desde la API | `postgres:5432` en la red de Compose |

Compose entrega a la API `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`,
`PGPASSWORD` y `PGPOOL_MAX`. NestJS usa `pg` con un pool acotado, comprueba la
conexión al arrancar y cierra el pool al detenerse. El endpoint
`GET /health/database` responde con estado `503` si PostgreSQL no está disponible.
PostgreSQL solo publica su puerto en la interfaz local del PC y persiste en
`postgres_data`.

Al iniciar la API, `pnpm dev:api` aplica las migraciones pendientes de
`apps/api/migrations` con historial en `schema_migrations`; las migraciones se
ejecutan bajo bloqueo y transacción. La migración inicial crea cuentas,
lavanderías y membresías para establecer la base multi-lavandería. No define
credenciales de inicio de sesión ni integra un proveedor de autenticación.
Para añadir esquema, crear un archivo SQL nuevo con prefijo numérico; no editar
migraciones ya aplicadas. También se puede ejecutar manualmente
`pnpm --dir apps/api db:migrate` cuando la API tenga las variables `PG*`.

El acceso a la base queda disponible mediante `DatabaseService` y consultas
parametrizadas de `pg`. No se ha seleccionado un ORM; los tipos y SQL de cada
funcionalidad deberán definirse explícitamente.

Para detener el entorno sin borrar los datos:

```powershell
docker compose down
```

No usar opciones o comandos que eliminen volúmenes. Cambiar las variables
`POSTGRES_*` no reconfigura usuarios, claves ni bases de datos de un volumen ya
inicializado; conservar el volumen y planificar esos cambios por separado.

Los scripts actuales `pnpm db:up` y `pnpm db:down` actúan sobre **todo** Compose,
aunque su nombre sugiera solo la base de datos. Para levantar únicamente
PostgreSQL usar `docker compose up -d postgres`. `pnpm dev:api` y
`pnpm dev:mobile` ejecutados en Windows arrancan procesos en el host; el flujo
Docker recomendado es el descrito arriba.

## Verificaciones

Consultar [AGENTS.md](AGENTS.md) para lint, compilación, tipos y pruebas por
aplicación. Para una comprobación básica con Docker activo:

```powershell
docker compose ps
Invoke-RestMethod http://localhost:3000
docker compose exec postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

`pg_isready` comprueba disponibilidad de PostgreSQL; no prueba una conexión
desde NestJS. Abrir la app en un dispositivo para verificar Expo y el acceso LAN.

## Estado actual

US-001.03 incorpora recuperación por correo, código y contraseña nueva, con
revocación de todas las sesiones. Recorrido real web confirmado por el usuario;
pendiente revisión visual nativa. Consultar
[contrato, pruebas y límites](docs/us-001.03-recuperacion.md).

Para probar Google en Android Studio, usar el build de desarrollo y el override
`compose.android.yaml` descritos en la [guía de acceso](docs/configuracion-acceso-y-pruebas.md#android-studio-build-local-y-cliente-google-de-desarrollo).

Ingreso por correo y sesiones, Google nativo Android/iOS preparados. Apple retirado y diferido por decisión del usuario.
Usuarios de prueba ya sembrados: consultar correos, contraseña privada de entorno,
pasos Resend/Google Cloud, decisión futura Apple y límites en la
[guía de acceso y pruebas](docs/configuracion-acceso-y-pruebas.md).
Los proveedores necesitan configuración y pruebas reales; no se han contratado
servicios ni generado builds remotos. Correo/fixtures se pueden probar en Expo Go.

- Existe la base del monorepo y el endpoint inicial de NestJS. US-001.01 incorpora
  API de registro, migración y formulario móvil con verificación OTP. Sigue en
  curso hasta validar entrega real y dispositivos; Docker y PostgreSQL 17 ya
  comprobados. Consultar
  [contrato, configuración y evidencia](docs/us-001.01-registro.md).
- Está configurado el entorno Docker para los tres servicios, con healthcheck,
  volumen persistente y sincronización Watch. La configuración valida con
  `docker compose config --quiet`.
- La conexión API–PostgreSQL se verificó en Docker: `/health/database` responde
  `ok` y `001_initial.sql` figura aplicada en `schema_migrations`.
- `002_customer_registration.sql` añade credenciales, registro temporal y cuotas;
  `003_sessions_and_federated_identity.sql` añade sesiones, identidades y pruebas
  de proveedor. Aplicadas al volumen local y probadas en PostgreSQL 17 temporal.
  La API protege rutas por defecto y verifica acceso por rol/membresía en los
  contratos iniciales. El modelo de lavandería aprobado usa solo `OWNER` y
  `STAFF`: el registro crea al propietario y este invita cuentas individuales
  de staff. La migración inicial conserva el valor legado `MANAGER`; se
  eliminará con una migración posterior al implementar el cambio, sin editar
  una migración aplicada. Faltan permisos y funciones de negocio: catálogo,
  comparación, pedidos, entrega en establecimiento/domicilio, pagos y las
  funciones de administración de lavanderías y de plataforma.
