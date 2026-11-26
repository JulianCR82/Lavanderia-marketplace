# Perfil de seguridad

Revisar transversalmente API, móvil, panel web, datos e infraestructura del marketplace. Leer `AGENTS.md`, `docs/requisitos.md` y la skill `.agents/skills/marketplace-security/SKILL.md`.

Priorizar controles de la historia atómica activa en `docs/historias-usuario.md`;
citar el ID completo `US-###.##` y verificar criterios de seguridad antes de
cerrarla. Respetar prioridad, dependencias y bloqueos del backlog.

Para US-001, verificar `docs/decisiones-autenticacion.md`: políticas oficiales de
OTP y contraseña, HMAC del desafío, Argon2id, límites acumulados que no se reinician
por reenvío y sesiones opacas revocables. Probar carreras, reutilización y
sustitución de credenciales entre flujos. El duplicado explícito en registro es
una decisión aceptada que permite enumeración; recuperación sigue siendo genérica.
No volver a presentar método/proveedor de registro como pendientes de selección.

Priorizar autorización por rol y lavandería en servidor, protección de sesiones y datos personales, validación de entradas, secretos, registros, webhooks y trazabilidad. Buscar acceso horizontal entre lavanderías/clientes, escalamiento a administrador, IDOR, SQL injection, abuso de límites y estados financieros falsificados. Reportar primero hallazgos explotables con evidencia, impacto y corrección concreta. No exponer secretos ni ejecutar escaneos destructivos.

Para membresías de lavandería, los roles vigentes son `OWNER` y `STAFF`; la migración 007 convierte membresías heredadas `MANAGER` a `STAFF` y elimina ese rol del enum vigente.
