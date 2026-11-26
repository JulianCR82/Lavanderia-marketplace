# Diseño móvil y adopción de las skills Expo

## Corrección de panel nativo y adaptación — US-001.05 — 2026-11-24

El usuario reportó contenido recortado y crash al tocar el cierre en Android.
Logcat confirmó AssertionError de gestos en Expo UI HostView: faltaba RNHostView
para alojar el contenido React Native en el BottomSheet Compose. Se añade el
puente, ancho del padre, ScrollView con altura máxima por ventana/insets y apertura
expandida para no ocultar acciones tras el estado parcial. Márgenes menores bajo
380 px y respeto de insets laterales en Screen/listado; paleta y diseño conservados.

Se observaron detalle, confirmación y cierre remoto sin crash en Pixel 8a API 36.
En navegador se verificó viewport efectivo 320×480 sin desbordamiento horizontal,
detalle desplazable y confirmación/cancelación alcanzables. No inferir layout
landscape: la app mantiene orientación portrait. Texto ampliado, lector de pantalla,
claro e iOS conservan sus pendientes. La revalidación automática de sesión se
detalla en [US-001.05](us-001.05-sesiones.md). Las notas siguientes son históricas.
Lint, tipos, seis pruebas del monitor y exportación final Android/iOS/web aprobados.

## Dirección global aprobada y aplicada — 2026-11-24

El usuario aprobó extender a toda la aplicación la propuesta moderna de sesiones.
Se actualizan el único tema y controles compartidos, ingreso, registro, recuperación,
principal, menú lateral, perfil y estados de sesión; la nueva ruta `/sesiones` sigue
la misma dirección. El panel administrativo todavía no existe; no se crea por este
encargo. El contenido de Explore permanece como plantilla protegida e inaccesible,
sin convertirse en función del producto.

Jerarquía tipográfica 30/21/16/14/12, espaciado por niveles, superficies discretas,
iconos SF/Material mediante `expo-symbols`, filas amplias, campos con ojo integrado
en los tres flujos de contraseña y mensajes inline consistentes. Se conserva la
paleta aprobada, drawer derecho, ingreso Google nativo y permisos del servidor.
Rappi expresa nivel de acabado, no una marca/función adicional.

`product-ui.tsx` incorpora encabezados, secciones, filas, iconos y mensajes; no hay
otro sistema de tokens ni dependencias nuevas. `BottomSheet` de Expo UI maneja
detalle y confirmación. Listas variables de sesiones usan FlatList. Fallback de
fila: ListItem universal instalado no expone label ni estado disabled accesible;
la fila Pressable conserva objetivo mínimo de 48, texto escalable y estado de acceso.
Botones y campos siguen usando Expo UI con Host.

Se conservan las reglas de OTP, limpieza de secretos, correo de solo lectura,
perfil opcional, roles/membresías, Google sin nueva vinculación y Apple diferido.
El guard global continúa autorizando cada llamada; ocultar rutas no concede permisos.
AuthProvider añade protección frente a respuestas tardías y revalidación al volver
a primer plano como parte de [US-001.05](us-001.05-sesiones.md).

Lint/tipos y exportación Android/iOS/web aprobados en esta entrega. Inspección
visual web oscura y recorridos de ingreso, perfil/guardado, navegación y dos sesiones
con cierre remoto/propio observados. Registro/recuperación iniciales revisados a
360 px; no se acredita 320 px porque ese override no se mantuvo en el navegador.
El usuario probará Android: no se registra todavía como validado. Claro, texto
ampliado, lector de pantalla, teclado/red nativos e iOS conservan pendientes.
Las secciones siguientes preservan la evidencia histórica de las versiones previas.

## Revisión posterior del login y navegación — 2026-11-24

Confirmación posterior del usuario: ojo dentro del campo, login compacto y
posición de Google, apertura/navegación/cierre del drawer, ausencia de vinculación
Google y hamburguesa solo con sesión ya están validados en Android. Se acredita
prueba manual reportada y cierre funcional Android de US-001.04. La prueba iOS
se difiere hasta disponer del entorno; las limitaciones de automatización que
se conservan abajo describen el estado anterior, no un pendiente de repetir
esas pruebas Android. Restaurar sesión al terminar/reabrir pertenece a US-001.02.

El usuario confirmó que la versión inicial de perfil funciona en el emulador
Android. Solicitó ajustes posteriores: ojo dentro del campo de contraseña,
login compacto, menú lateral y retiro de vinculación Google del perfil.

`PasswordField` reutiliza `FormField` con accesorio final y espacio reservado;
usa SF Symbols/Material Symbols según plataforma, sin sustituir Expo TextInput.
El login agrupa controles y coloca Google inmediatamente debajo de Ingresar;
los enlaces de recuperación y registro comparten fila, con objetivos táctiles
conservados. El desplazamiento sigue disponible cuando lo exige el teclado o
el tamaño del texto; no se garantiza ausencia de scroll para todas las pantallas.

Expo Router Drawer sustituye la hoja inferior inicial: abre desde la derecha,
mantiene Perfil arriba a la derecha, admite gesto y botón Atrás de Android y
se comparte entre Inicio y Perfil. Las rutas se protegen según sesión; el gesto
del drawer está deshabilitado sin sesión. Se usan dependencias existentes.
La vinculación Google se elimina de la interfaz y de los endpoints API; las
cuentas e identidades ya existentes conservan su acceso.

Lint/tipos y exportaciones web/Android/iOS aprobados; API con seis unitarias y
58 e2e PostgreSQL 17 aprobados. La automatización no obtuvo una captura útil
del emulador y la recarga web agotó el tiempo. La revisión visual de estos nuevos
ajustes queda pendiente; no invalida la prueba Android anterior del usuario.
La sección siguiente describe la implementación inicial sustituida en esta revisión.

## Actualización US-001.04 — 2026-11-24

Se incorporó principal con saludo y acceso Perfil arriba a la derecha, junto a
hamburguesa de opciones; la cuenta pasó a `/perfil`, con nombre opcional editable
y correo de solo lectura. Google se muestra después de las opciones de correo.
Se conservan tema, componentes y acceso Google existente. Menú mediante hoja
universal Expo UI; no hay `Menu` universal en el paquete instalado y la alternativa
community no ejecuta acciones en web. Detalles y límites en el
[contrato de perfil](us-001.04-perfil.md).

Lint/tipos y exportaciones web/Android/iOS aprobados. Inspección visual y prueba
en dispositivo pendientes: el control de navegador no pudo completar la revisión.
Los apartados siguientes conservan la auditoría histórica del 2026-11-23.

Actualizado: 2026-11-23. Alcance: pantallas existentes de ingreso, registro/OTP,
cuenta y recuperación de sesión de US-001.01/.02/.07. No incorpora funciones de
catálogo/pedidos ni vuelve a habilitar Apple. Resend y Google externos siguen pendientes.

## Fuentes y selección de skills

Se revisó el catálogo local de 25 skills `expo-*`/`eas-*`. Se aplican por objetivo:

| Trabajo | Skills |
| --- | --- |
| Entrada y compatibilidad SDK | [expo-overview](../.agents/skills/expo-overview/SKILL.md) |
| Tema y componentes reutilizables | [expo-design-system](../.agents/skills/expo-design-system/SKILL.md) |
| Composición y comportamiento nativos | [expo-native-ui](../.agents/skills/expo-native-ui/SKILL.md) |
| Controles SwiftUI/Compose/universales | [expo-ui](../.agents/skills/expo-ui/SKILL.md) |
| Navegación y títulos | [expo-router](../.agents/skills/expo-router/SKILL.md) |
| Estados de red y sesión | [expo-data-fetching](../.agents/skills/expo-data-fetching/SKILL.md) |
| Movimiento/gestos | expo-animation, solo si hacen falta |
| Desarrollo, firma y tiendas | expo-dev-client, eas-app-stores |
| OTA, CI, hosting y métricas | eas-update, eas-workflows, eas-hosting, eas-observe/eas-update-insights |
| Simulador remoto | eas-simulator, solo al solicitar ese entorno |

Las demás skills cubren módulos, migraciones y proyectos nuevos; se consultan al
abordar esas tareas. No se adapta la estructura existente a una plantilla nueva.
No se activaron servicios remotos ni se añadieron dependencias.

## Auditoría y cambios

El sistema existente es StyleSheet/estilos React Native y un único tema en
`apps/mobile/src/constants/theme.ts`. La paleta de [marca](brand.md) se conserva.
La regla específica de marca de expo-design-system prevalece sobre los ejemplos
de colores del sistema que aparecen en otras skills.

Hallazgos iniciales: ocho declaraciones fontSize en las tres pantallas principales,
anchos máximos distintos, títulos de contenido con el Stack oculto, botones
repetidos sin feedback de pulsación y objetivos de interacción de 44/48/52.
Los formularios ya tenían estados de error/carga y tokens de color; se conservaron.

- Typography y Layout amplían el tema existente; ThemedText consume la misma escala,
  permite texto del sistema y conserva la API usada por componentes existentes.
- Screen comparte ancho legible, scroll, insets y ajuste de teclado iOS. El Stack
  administra el título; registro tiene ruta `/registro`, navegación atrás real y
  espera la restauración de sesión antes de decidir qué mostrar.
- FormField adapta valores controlados al estado observable de Expo UI. La API
  instalada usa `set`; preserva contraseña oculta, autocompletado y borrado de
  secretos tras enviar. No introduce almacenamiento de contraseñas.
- ActionButton conserva botón nativo y añade estado asíncrono/accesible. Usa
  variantes filled/outlined/text, título estable y bloqueo al procesar. Los Host
  tienen ancho explícito; se elimina la altura web de 40 px para crecer con texto.
- El botón oficial Google se conserva. Correo sigue disponible; no hay acciones
  habilitadas que simulen éxito. Perfil/membresías y permisos siguen viniendo de API.
- Errores y datos copiables usan texto seleccionable; el error no depende solo de
  color. No se añadieron gradientes, tarjetas decorativas, animaciones ni haptics.

Los bloques de datos de cuenta se mantienen en el scroll existente. Al implementar
catálogos/listas extensas usar una lista virtualizada; Expo UI List no sustituye
una lista grande. No se convierte la pantalla tutorial heredada en una función del producto.

## Verificación y límites

Lint y tipos móviles aprobados en la imagen final; exportación web y bundles
JavaScript Android/iOS generados, sin compilar binarios nativos firmados. Expo CLI
conservó la sesión al reconstruir. No se cambiaron contratos ni lógica de la API;
no se repitió su batería por esta adaptación de UI.

Auditoría estática posterior en TSX de auth/registro: cero declaraciones fontSize
y cero hexadecimales fuera del tema (0 escapes por 100 líneas en ambas categorías).
Contraste calculado contra fondo de pantalla para texto, texto secundario, acción
y error: todos mayores a 4,5:1; mínimos 5,15:1 claro y 6,28:1 oscuro. Esto no
sustituye la prueba visual de cada control y estado.

En web a 390 px se midieron
campos de 60 px y botones de 58 px; se probó mostrar/ocultar contraseña, rechazo
de credenciales ficticias, borrado del campo secreto, validación de longitud y
navegación ida/vuelta de registro. A 1280 px, campos de 512 px dentro del ancho
legible y sin desbordamiento horizontal. Evidencia en modo oscuro:
`artifacts/diseno-expo-registro.jpg`. No se enviaron OTP reales ni se completó
Google externo. La revisión visual detectó
y corrigió el ancho/alto inicial de los Host. La comprobación web no acredita
teclado físico, texto accesible del sistema ni VoiceOver/TalkBack en Android/iOS.
Pendientes: prueba visual nativa de ingreso/registro/cuenta, teclado, autofill y
texto grande, y revisión visual del modo claro. La paleta clara sí se comprobó
mediante cálculo de contraste, sin afirmar inspección visual en ese modo.
No se declara cerrada una HU por cambiar su diseño.

La revisión automática rechazó descargar/ejecutar `@expo/agent-cli@latest` por
código sin versión fijada. No se eludió el rechazo ni se envió feedback externo;
las comprobaciones locales usan Expo y dependencias ya instaladas.

Persistencia: [instrucciones móviles](../apps/mobile/AGENTS.md),
[instrucciones del proyecto](../AGENTS.md) y [perfil frontend](agents/frontend.md).
Los siguientes agentes deben leerlas; escribirlas no prueba carga automática ni
activación implícita de todas las skills en sesiones futuras.
