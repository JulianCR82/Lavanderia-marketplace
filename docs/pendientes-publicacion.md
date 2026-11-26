# Pendientes para publicación inicial

Registrados por solicitud del usuario el **2026-11-24**, para abordarlos después.
Son pendientes de planificación y ejecución: no se han creado nuevas HU, cambiado
IDs, ampliado criterios ni implementado estas funciones por este registro.
El backlog vigente sigue en [historias de usuario](historias-usuario.md).

## Ajustes pendientes del backlog

- [ ] Incorporar una HU de eliminación de cuenta y datos: solicitud desde la app
  y vía externa requerida por Google Play; definir autenticación, confirmación,
  revocación de acceso y tratamiento de pedidos/pagos activos. Definir datos a
  eliminar, anonimizar o conservar, fundamento y plazo de retención antes de migrar.
- [ ] Incorporar privacidad: política pública accesible, explicación del uso de
  datos y permisos, y declaraciones de privacidad de las tiendas que reflejen
  código y SDK realmente usados. No presuponer consentimiento como base para todo.
- [ ] Revisar autenticación iOS antes de publicación: configuración y prueba de
  Google, alternativa equivalente y excepciones de la sección 4.8 de Apple.
  Apple sigue diferido; este pendiente no autoriza reactivarlo ni contratar servicios.
- [ ] Revisar criterios de las HU pertinentes para incluir accesibilidad,
  fallos de red/reintentos y compatibilidad de plataformas donde falten.
- [ ] Acordar seguimiento separado de implementación y evidencia web/Android/iOS.
  No inferir prueba iOS de una exportación o de una prueba Android. Conservar las
  pruebas ya confirmadas, incluida recuperación web y Android de US-001.03.

## Tareas técnicas de lanzamiento pendientes

- [ ] Preparar entorno de producción: API HTTPS, configuración de secretos,
  migraciones, respaldos con prueba de restauración y seguimiento de errores
  sin datos sensibles. No convertir Docker de desarrollo en despliegue público.
- [ ] Configurar dominio/remitente verificados antes de enviar a destinatarios distintos del correo asociado a la cuenta Resend o distribuir el MVP. Diferido por decisión del usuario el 2026-11-25; no bloquea el desarrollo con remitente de prueba.
- [ ] Preparar firma, identificadores, versiones, recursos gráficos, capturas,
  fichas, contacto de soporte y acceso de revisión sin exponer credenciales aquí.
- [ ] Completar pruebas nativas de iOS y beta en dispositivos; revisar los
  requisitos de acceso a producción aplicables a la cuenta Google Play concreta.
- [ ] Comprobar configuración de producción de proveedores de acceso y pagos,
  y volver a revisar políticas/SDK objetivo vigentes al preparar cada lanzamiento.

La comisión global configurable y el split directo entre plataforma y lavandería
se decidieron el 2026-11-25; 10%/90% es solo un ejemplo. El proveedor, tarifas,
impuestos, ajustes por peso, liquidación, devoluciones y contracargos siguen en
el backlog. Ver [decisiones del modelo comercial](decisiones-modelo-comercial.md).
No todas estas tareas necesitan una HU: separar necesidades del usuario, decisiones
de producto y tareas operativas. No exigir terminarlas para continuar US-001.04.

## Uso en próximas tareas

Consultar solo los pendientes pertinentes al encargo. Cuando se aborden, contrastar
este registro con el backlog, código y políticas oficiales actuales; concretar
dependencias y criterios, conservar IDs existentes y registrar la evidencia real.
La autorización actual es guardar pendientes y referencias en skills, no
implementarlos ahora, pagar membresías ni publicar una aplicación.

Fuentes de la revisión del 2026-11-24:

- [Apple: pautas de revisión](https://developer.apple.com/app-store/review/guidelines/).
- [Google Play: eliminación de cuenta](https://support.google.com/googleplay/android-developer/answer/13327111).
- [Google Play: datos del usuario](https://support.google.com/googleplay/android-developer/answer/10144311).
- [Google Play: pruebas para cuentas personales nuevas](https://support.google.com/googleplay/android-developer/answer/14151465).
