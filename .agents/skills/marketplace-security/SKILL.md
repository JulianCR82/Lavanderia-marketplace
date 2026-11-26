---
name: marketplace-security
description: Review or implement security controls for the marketplace API, mobile app, admin panel, database, and deployment. Use for authentication, authorization, tenant isolation, privacy, threat review, or security-sensitive changes.
---

# Marketplace security

Read `docs/historias-usuario.md`; scope security work to relevant atomic stories (full ID such as `US-003.04`) and their acceptance criteria. Respect priority/dependencies; parent IDs are grouping references. Also read `AGENTS.md`, `docs/requisitos.md`, and relevant domain instructions. Treat every client, request field, webhook, uploaded file, and provider response as untrusted. Keep authorization on the server and deny by default. Verify role, tenant membership, and resource ownership on every request; test cross-laundry and cross-customer access explicitly.

Protect credentials and personal data: keep secrets server-side, use environment/secret management, redact logs, minimize collection, and avoid exposing internal errors. Validate and bound inputs; use parameterized SQL; configure CORS, rate limits, secure transport, and session/token handling as the relevant authentication design requires. Never claim an app is secure solely because routes are hidden in the UI.

For payments, verify provider-signed webhooks, enforce idempotency and replay protection, reconcile asynchronous events, and never trust a client redirect as proof of payment. Do not store card data. For admin actions and sensitive price approvals, record actor, time, and the relevant before/after values.

For security review, state scope, assumptions, concrete findings, severity, exploit path, and remediation. Do not silently broaden access or weaken checks for convenience. Do not run destructive scans or alter production systems without explicit task authorization. Do not expose secrets in reports.

For account deletion, privacy, identity-provider or release-readiness work, consult `docs/pendientes-publicacion.md`. Verify relevant current store policies and actual SDK/data behavior when that work is undertaken; distinguish implementation from platform test evidence. Apple login remains deferred. The register records future work, not permission to enable providers, buy memberships or publish.
