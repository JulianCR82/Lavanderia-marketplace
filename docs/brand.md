# Paleta de colores

## Dirección de diseño aprobada — 2026-11-24

El usuario aprobó extender a toda la aplicación el acabado moderno de la propuesta
de sesiones: jerarquía tipográfica clara, espacios por niveles, iconos nativos
coherentes, superficies discretas, filas amplias y detalle/acciones en panel inferior.
Rappi es referencia de calidad de experiencia; el marketplace conserva su marca.
Mantener una única paleta y tema, navegación nativa, accesibilidad, claro/oscuro y
los flujos existentes. Confirmar cierres sensibles; esperar respuesta del servidor
y conservar el estado ante fallos. No presentar funcionalidades futuras como hechas.
Aplicar también a pantallas nuevas y estados de carga, error, vacío y éxito.

## Colores

| Token | Claro | Oscuro | Función |
| --- | --- | --- | --- |
| `primary` | `#234A63` | `#A4C2D0` | Acción principal, navegación activa y enlaces |
| `primaryPressed` | `#19394E` | `#C1D7DF` | Presión/selección fuerte |
| `secondary` | `#527A68` | `#9BC1A7` | Detalles de servicio, etiquetas y progreso |
| `accent` | `#C97852` | `#E69A73` | Acento cálido puntual; evitar usarlo en grandes superficies |
| `background` | `#F5F1E8` | `#18252B` | Fondo de pantalla, lino cálido |
| `backgroundElement` | `#FCFBF7` | `#23343A` | Superficies elevadas y formularios |
| `backgroundSelected` | `#E4E8DF` | `#30443F` | Selección discreta |
| `text` | `#26343A` | `#F2EEE5` | Texto principal |
| `textSecondary` | `#5C6864` | `#B8C2B9` | Texto secundario |
| `border` | `#D8D3C8` | `#405057` | Divisores y contornos |
| `success` | `#347257` | `#88C2A0` | Pedido listo, pago confirmado |
| `warning` | `#8A5A20` | `#E9BD77` | Espera o acción requerida |
| `danger` | `#A94343` | `#E58C82` | Error, rechazo o acción destructiva |

El azul es el color de acción. Verde comunica operación y avance. Terracota da identidad, no compite con los botones principales. El amarillo/terracota nunca debe ser el único medio de indicar un estado. Toda señal por color se acompaña con texto o icono. Revisar contraste de texto, controles y estados al diseñar cada pantalla.

Los colores se mantienen en `Colors.light` y `Colors.dark` de
`apps/mobile/src/constants/theme.ts`; consumir sus tokens en las pantallas.

La estructura de diseño, componentes, tipografía, composición y movimiento sigue
[expo-design-system](../.agents/skills/expo-design-system/SKILL.md) y sus skills
complementarias de Expo. Esta guía conserva la paleta y la dirección visual
global aprobada; las APIs y comportamientos de plataforma siguen las guías Expo.
