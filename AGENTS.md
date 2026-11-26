# Instrucciones del proyecto

Marketplace familiar de lavanderías para Bogotá, preparado desde el inicio para
múltiples lavanderías independientes. Mantener una arquitectura sencilla y modular.

## Memoria persistente de este proyecto

Estas instrucciones se limitan a `lavanderia-marketplace` y complementan las
instrucciones existentes; no modifican las reglas globales ni otros proyectos.

- La bóveda autorizada es `F:/DevKnowledge`, identificada por su carpeta
  `.obsidian`. Antes de trabajar en ella, comprobar acceso y leer su `AGENTS.md`.
  No crear otra bóveda ni cambiar su organización, plugins o configuración.
- Antes de tareas significativas, leer
  `F:/DevKnowledge/proyectos/lavanderia-marketplace.md`; para trabajo especializado,
  consultar `F:/DevKnowledge/resources/lavanderia-agentes-y-skills.md` y las notas
  relacionadas pertinentes. Buscar por nombre, alias y contenido antes de crear
  notas. Contrastar siempre memoria con código, requisitos e instrucciones actuales.
- El repositorio conserva la autoridad sobre instrucciones ejecutables, requisitos
  y backlog: leer los originales de `docs/agents/`, `.agents/skills/` y
  `docs/historias-usuario.md` según la tarea. Obsidian describe y enlaza esos
  originales; no copiar, migrar ni sustituir agentes o skills desde la bóveda.
- Al terminar cambios significativos y verificados, actualizar directamente la
  nota existente pertinente sin requerir un recordatorio: estado real, ID de
  historia si aplica, decisiones y consecuencias, problemas y soluciones
  confirmadas, archivos de referencia, fecha y evidencia de validación. Separar
  implementación, diseño, propuestas, pendientes y pruebas no ejecutadas.
- Conservar wikilinks a destinos existentes y convenciones de la bóveda. Crear
  notas adicionales solo con valor independiente; evitar duplicados, conversaciones
  triviales, código completo, secretos y datos personales innecesarios.
- Esta memoria usa Markdown y rutas explícitas para poder consultarse también
  desde OpenCode o Claude Code. No presupone descubrimiento nativo de skills ni
  carga de instrucciones en esas herramientas: el agente debe leer este archivo,
  el `AGENTS.md` de la bóveda y las notas indicadas. No crear adaptadores específicos
  ni modificar sus configuraciones como efecto secundario.
- Si falta acceso, informar la limitación y qué actualización quedó pendiente;
  no crear copias paralelas ni ampliar permisos automáticamente. La actualización
  ocurre dentro de la tarea del agente; no hay sincronización en segundo plano.
  Verificar lectura, escritura y relectura antes de afirmar una actualización;
  no prometer automatismo entre sesiones que no se haya probado.

## Estructura y tecnologías

- `apps/api`: NestJS 11 y TypeScript; módulos en `src/`, migraciones SQL en
  `apps/api/migrations`, pruebas unitarias junto al código y e2e en `test/`.
  PostgreSQL se accede con `pg` mediante `DatabaseService`; no hay ORM elegido.
- `apps/mobile`: React Native, Expo SDK 58, TypeScript y Expo Router; rutas en
  `src/app/`. Respetar además las instrucciones de `apps/mobile/AGENTS.md`.
- PostgreSQL 17; monorepo pnpm **12.21.0** con aplicaciones en `apps/*`.
- Windows 11, Docker Desktop con contenedores Linux y Compose Watch.
  `Dockerfile.dev` usa Node 24.14.0 e instala las dependencias con pnpm.
- Usar pnpm. Para instalar dependencias Expo compatibles, usar
  `pnpm exec expo install` desde la aplicación móvil.
- Guías de roles en `docs/agents/` y skills invocables del proyecto en
  `.agents/skills/` (API, móvil, datos, seguridad y pagos). Consultar la guía o
  skill pertinente para trabajo especializado; estas no sustituyen el alcance
  del usuario ni autorizan operaciones financieras o destructivas.
- Las historias funcionales, sus IDs estables y el orden recomendado están en
  `docs/historias-usuario.md`. Los IDs padre `US-001`–`US-014` agrupan; las
  historias implementables usan sufijos (`US-001.01`). Elegir la historia
  atómica pendiente de menor orden cuyas dependencias y bloqueos estén resueltos,
  conservar el ID y respetar prioridad y criterios de aceptación. No renumerar
  IDs ni saltar dependencias silenciosamente.

## Desarrollo con Docker

Desde la raíz; preparar `.env` y `DEV_HOST_IP` según `README.md`:

```powershell
docker compose config --quiet
docker compose up --build --watch
docker compose ps
docker compose logs --tail 100 api mobile
docker compose down
```

Watch sincroniza solo `apps/api/src`, `apps/mobile/src` y `apps/mobile/assets`.
Para dependencias, lockfile o configuración fuera de esas rutas, reconstruir y
recrear los servicios afectados; reiniciar Watch. Los archivos del repositorio
son la referencia: no dejar cambios únicamente dentro de un contenedor.

## Verificaciones

Con los servicios activos, desde la raíz:

```powershell
# API: lint sin --fix para evitar cambios implícitos, compilación y pruebas.
docker compose exec api pnpm --dir apps/api exec eslint "{src,apps,libs,test}/**/*.ts"
docker compose exec api pnpm build:api
docker compose exec api pnpm --dir apps/api test --runInBand
docker compose exec api pnpm --dir apps/api test:e2e --runInBand

# Móvil: lint y tipos; validar también las pantallas afectadas en dispositivo.
docker compose exec mobile pnpm lint
docker compose exec mobile pnpm exec tsc --noEmit
```

El móvil tiene configuración ESLint propia y dependencias compatibles instaladas
con Expo. No aceptar instalaciones implícitas en una tarea limitada a documentación.
Para documentación, revisar comandos, enlaces y `git diff --check`; no hace
falta ejecutar toda la batería de aplicaciones. Informar verificaciones omitidas
o bloqueadas sin afirmar que pasaron.

## Diseño, datos y seguridad

- Para diseño y trabajo Expo, seguir `apps/mobile/AGENTS.md`: comenzar por
  `expo-overview`, cargar las skills pertinentes y conservar el tema/paleta únicos.
  Aplicar en toda la app la dirección moderna aprobada el 2026-11-24 en
  `docs/brand.md`, conservando navegación, accesibilidad y funcionalidades.
  La auditoría de adopción está en `docs/diseno-mobile.md`. Estas pautas se leen en
  cada sesión; no suponen activación automática de todas las skills instaladas.

- Autenticación aprobada y criterios de US-001: consultar
  `docs/decisiones-autenticacion.md` y `docs/historias-usuario.md`. Correo con
  contraseña, OTP vía Resend, Google con sesiones opacas están elegidos; Apple queda como decisión futura; distinguir
  decisiones oficiales, configuración operativa pendiente e implementación.
- Organizar por capacidades de negocio en módulos NestJS; evitar microservicios
  y abstracciones innecesarias. Distinguir lo implementado de lo previsto.
- Usar `DatabaseService` y consultas parametrizadas. Crear una migración SQL
  numerada para cambios de esquema; no alterar migraciones ya aplicadas.
- Cada lavandería administra su catálogo y pedidos. Aplicar en el backend el
  aislamiento de datos y permisos por lavandería, validando pertenencia y rol
  en cada operación; no confiar en identificadores enviados por el cliente.
- Los únicos roles vigentes de membresía de lavandería son `OWNER` y `STAFF`.
  La cuenta creadora recibe `OWNER`; el propietario invita cuentas individuales
  como `STAFF`. No asignar `MANAGER`, no elevar desde el cliente y no confundir
  roles de lavandería con `CUSTOMER`/`PLATFORM_ADMIN`. La migración inicial aún
  enumera `MANAGER`: conservarla; la migración `007_laundry_membership_roles.sql`
  ya convierte esos vínculos a `STAFF` y deja solo `OWNER`/`STAFF`.
- Consultar `docs/decisiones-modelo-comercial.md` para cuentas y comisiones.
  Aceptar una invitación `STAFF` con confirmación convierte la misma cuenta de
  cliente a trabajo exclusivo, conserva identidad/historial y revoca sesiones;
  no exige otro correo ni permite alternar cliente/trabajo. La migración 008
  persiste esta clasificación. El autorregistro `OWNER` sigue pendiente.
- El ingreso de la plataforma es una comisión por cada pago de un servicio que
  recibe la lavandería, con una tasa global configurable por `PLATFORM_ADMIN`.
  No hay cobro de membresía/suscripción comercial; `laundry_memberships` solo
  representa permisos. No cobrar otra comisión al liquidar, retirar o transferir
  esos mismos fondos. 10% es ejemplo; implementación financiera aún pendiente.
- Distinguir clientes, miembros de cada lavandería y administrador de plataforma;
  cualquier acceso entre lavanderías debe estar autorizado explícitamente.
- No exponer secretos, contenido de `.env` ni credenciales en código, logs o
  documentación. `EXPO_PUBLIC_*` es público: nunca almacenar secretos allí.
- Validar entradas como datos no confiables y usar consultas SQL parametrizadas.
  Denegar por defecto; verificar rol, lavandería y pertenencia al recurso en el
  backend para cada operación. Ocultar controles en un cliente no es autorización.
- No confiar en redirecciones del cliente para confirmar pagos. Verificar
  webhooks del proveedor, procesar eventos de forma idempotente y separar los
  estados de pedido y pago. No guardar datos de tarjeta.
- Registrar cambios sensibles con actor y fecha, sin incluir secretos ni datos
  de pago innecesarios. Minimizar datos personales y limitar acceso administrativo.
- No eliminar volúmenes PostgreSQL ni ejecutar `docker compose down -v`,
  `docker volume rm` o limpiezas de volúmenes. Preservar cambios existentes
  del usuario y limitar cada tarea al alcance solicitado.
