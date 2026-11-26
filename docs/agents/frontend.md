# Agente de frontend

La paleta inicial del producto está documentada en `docs/brand.md`; consumir los
tokens semánticos de `apps/mobile/src/constants/theme.ts` en las pantallas.
Para diseño, seguir `.agents/skills/expo-design-system/SKILL.md` y sus referencias
Expo; conservar la paleta y la dirección moderna global aprobada el 2026-11-24
en `docs/brand.md` y `apps/mobile/AGENTS.md`, con sus estados y funcionalidades.
Tomar la siguiente historia atómica disponible de `docs/historias-usuario.md`,
respetando prioridad y dependencias; conservar el ID completo (`US-###.##`) y
criterios de aceptación. Los IDs padre agrupan historias. No desarrollar una
pantalla aislada de su regla de backend.

## Misión
Implementar la experiencia móvil de clientes y lavanderías en `apps/mobile` con React Native, Expo SDK 58, Expo Router y TypeScript. El panel web de administración es una aplicación separada aún por crear; compartirá la API y sus reglas de negocio.

## Reglas de trabajo

- Diseño Expo actualizado: leer `apps/mobile/AGENTS.md` y `docs/diseno-mobile.md`.
  Usar `expo-overview` para seleccionar skills y `expo-design-system` +
  `expo-native-ui` + `expo-ui` para pantallas y controles. Conservar paleta y tema
  únicos; verificar APIs en los tipos instalados. Navegación, red y animación
  tienen skills propias; no habilitar servicios remotos por una revisión visual.

- Leer `AGENTS.md`, `apps/mobile/AGENTS.md` y `docs/requisitos.md`; usar `docs/mvp.md` para el alcance y sus decisiones pendientes.
- Para US-001, seguir `docs/decisiones-autenticacion.md`: correo/contraseña sin teléfono, OTP de 6 dígitos, Google nativo Android/iOS; Apple queda diferido, sin botón ni capacidad nativa. Respetar gestores/pegar/mostrar contraseña, expiración, reenvíos, errores y cancelación. US-001.02 integra ingreso automático y SecureStore. Google necesita development build; Expo Go sigue disponible para correo/fixtures. Perfil y membresías vienen de API; no inventar sesiones ni elevar roles desde UI. No tomar contadores de UI como autoridad frente al servidor.
- Antes de usar APIs de Expo, consultar la documentación de la versión SDK 58 según las instrucciones locales de `apps/mobile/AGENTS.md`.
- Mantener navegación en `src/app/` y código reutilizable fuera de esa carpeta. Seguir patrones móviles accesibles para Android e iOS.
- Tratar la API como autoridad: no calcular permisos ni precios definitivos solo en el cliente. Mostrar claramente estimaciones, peso definitivo, diferencia e importe que el cliente debe aprobar.
- No guardar secretos en el bundle ni en variables `EXPO_PUBLIC_*`. Manejar estados de carga, errores, reintentos y confirmación para prevenir solicitudes duplicadas.
- No inventar flujos para decisiones aún abiertas, especialmente pagos, disponibilidad, horarios, cobertura o autenticación. Identificar la decisión y su impacto antes de implementar.
- Lavandería y cliente comparten aplicación con acceso según rol; no exponer datos de otras lavanderías en interfaz ni confiar en ocultar controles como autorización.
- Los roles de lavandería son únicamente `OWNER` y `STAFF`, con cuentas individuales. La UI puede ofrecer controles distintos para propietario y staff, pero la API decide y valida cada permiso; no crear flujos ni pantallas para `MANAGER`.

## Verificación

Seguir los comandos móviles de `AGENTS.md` y `apps/mobile/AGENTS.md`. Comprobar en Android e iOS los flujos de pantalla afectados cuando el entorno esté disponible. No editar carpetas nativas generadas manualmente.
