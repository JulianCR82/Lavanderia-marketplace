This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Pautas persistentes del proyecto — 2026-11-23

### Diseño aprobado para toda la aplicación — 2026-11-24

- Aplicar a todas las pantallas existentes y futuras la dirección moderna aprobada:
  jerarquía tipográfica, espacios diferenciados, iconos coherentes, filas táctiles
  agrupadas y acciones claras. La referencia Rappi expresa nivel de acabado;
  conservar la identidad y paleta del marketplace.
- Mantener navegación nativa y el drawer derecho, campos con ojo integrado,
  estados de carga/error/vacío, datos del usuario y funcionalidades existentes.
- Reservar paneles inferiores nativos para detalles/acciones y confirmar cierres
  sensibles. Evitar llenar la pantalla de botones destructivos, tarjetas o bordes.
- Usar el único tema y los componentes de `src/components/product-ui.tsx`;
  documentar limitaciones de controles antes de usar un fallback. No presentar
  catálogo/pedidos previstos como servicios ya disponibles.

Para tareas Expo/EAS, leer primero `.agents/skills/expo-overview/SKILL.md` desde
la raíz del repositorio y seguir su selección por objetivo. Leer solo las skills
especializadas pertinentes, además de `marketplace-mobile`; no aplicar todas por
rutina ni reestructurar esta aplicación existente para seguir una plantilla nueva.

- Diseño: `expo-design-system`, `expo-native-ui` y `expo-ui`. Conservar la paleta
  aprobada de `docs/brand.md` y el único tema `src/constants/theme.ts` (`Colors`,
  `Spacing`, `Shape`, `Typography`, `Motion`, `Layout`). Los ejemplos de colores
  de otras skills no sustituyen la marca. No repetir números tipográficos.
- Consultar tipos instalados de `@expo/ui` y documentación SDK 58 antes de elegir
  controles. Preferir componentes universales con `Host`; no envolver controles
  solo para renombrarlos. Documentar cualquier fallback por una capacidad ausente.
  `List` de Expo UI es para grupos cortos; listas de tamaño desconocido requieren
  FlatList/FlashList según la versión instalada. No introducir dependencias sin necesidad.
- Interoperabilidad en paneles Expo UI: envolver un subárbol React Native con
  `RNHostView`, con una sola raíz y `matchContents={{ vertical: true }}` para
  tomar el ancho del padre. No insertar `View`/`ScrollView` ni un `Host` de botón
  directamente en el árbol Compose/SwiftUI. El BottomSheet universal crea su
  propio Host cuando está fuera de un árbol nativo; conservar ese comportamiento.
  Limitar la altura del contenido según ventana/insets y permitir scroll; evitar
  una apertura parcial que recorte acciones. Ver corrección US-001.05 en
  `docs/us-001.05-sesiones.md`: se verificó un crash nativo por omitir el puente.
- Reutilizar `Screen`, `ThemedText`, `ActionButton` y `FormField` cuando corresponda.
  Screen delega título al Stack, scroll e insets; ActionButton añade estado asíncrono
  al botón nativo. FormField adapta cadenas controladas al estado observable de
  Expo UI usando su API `set`; conservar limpieza de contraseña/OTP y autocompletado.
- Tipografía escalable, controles de al menos 48 dp/pt en la aplicación, labels
  accesibles, estados disabled/busy, errores seleccionables y anunciados. Acciones
  alcanzables con teclado y texto grande; verificar claro/oscuro y ancho pequeño.
  Los botones oficiales de proveedor conservan su identidad y comportamiento.
- Navegación: `expo-router`; solicitudes/autenticación/estado de red:
  `expo-data-fetching`; animación/gestos/teclado animado: `expo-animation`.
  No añadir movimiento, tarjetas decorativas, haptics ni nuevas funciones por rutina.
- Dev builds: `expo-dev-client`; firma/publicación: `eas-app-stores`;
  OTA: `eas-update`; CI: `eas-workflows`; métricas: `eas-observe` o
  `eas-update-insights`; web hosting: `eas-hosting`; simulador remoto: `eas-simulator`.
  Consultar las demás skills solo al abordar su objetivo. No iniciar servicios
  remotos, contratar planes o publicar como efecto secundario de diseño.
- La CLI de agente es recomendada por expo-overview; si no está disponible o una
  revisión de permisos rechaza descargarla, documentar la limitación y usar la CLI
  Expo ya instalada para verificaciones locales. No eludir rechazos ni descargar
  otra versión para sortearlos. Usar pnpm y documentación del SDK del proyecto.
- Cerrar con lint/tipos y pruebas de los flujos afectados, exportación cuando cambie
  integración nativa y evidencia visual disponible. Web adaptable no acredita
  teclado, VoiceOver/TalkBack ni renderizado físico Android/iOS.

Estas reglas son archivos persistentes que deben leerse al comenzar otra sesión;
no implican carga automática de todas las skills. Auditoría y límites actuales en
`docs/diseno-mobile.md` desde la raíz del repositorio. Apple continúa diferido.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Roles del marketplace

- Los roles de lavandería son únicamente `OWNER` y `STAFF`, con cuentas individuales. El propietario administra su lavandería e invita al personal como `STAFF`; el staff solo ve las funciones que la API le autorice.
- No implementar interfaces ni lógica para `MANAGER`. No confundir roles de lavandería con `CUSTOMER`/`PLATFORM_ADMIN`; el cliente nunca decide permisos y ocultar controles no sustituye la autorización del backend.
