---
name: marketplace-security
description: Review or implement security controls for the marketplace API, mobile app, admin panel, database, and deployment. Use for authentication, authorization, tenant isolation, privacy, threat review, or security-sensitive changes.
---

# Marketplace security

Read `docs/historias-usuario.md`; scope security work to relevant atomic stories (full ID such as `US-003.04`) and their acceptance criteria. Respect priority/dependencies; parent IDs are grouping references. Also read `AGENTS.md`, `docs/requisitos.md`, and relevant domain instructions. Treat every client, request field, webhook, uploaded file, and provider response as untrusted. Keep authorization on the server and deny by default. Verify role, tenant membership, and resource ownership on every request; test cross-laundry and cross-customer access explicitly.

Protect credentials and personal data: keep secrets server-side, use environment/secret management, redact logs, minimize collection, and avoid exposing internal errors. Validate and bound inputs; use parameterized SQL; configure CORS, rate limits, secure transport, and session/token handling as the relevant authentication design requires. Never claim an app is secure solely because routes are hidden in the UI.

Read `docs/decisiones-modelo-comercial.md`. Laundry access has only `OWNER`/`STAFF`; platform admins receive no implicit membership. STAFF invitation acceptance requires explicit confirmation and converts the same customer account to exclusive work (`account_kind: LAUNDRY`), preserves identity/history and revokes previous sessions. Verify that work accounts cannot use customer operations even when `platform_role` remains `CUSTOMER`, that removing memberships does not restore those capabilities, and that invitations cannot escalate roles. Separate accounts/emails and a customer/work switch are superseded product rules.

Revenue is a commission on each service payment received by a laundry, with a global rate configurable only by `PLATFORM_ADMIN`; memberships confer access and are not paid subscriptions. For future financial work, verify server-controlled rate/recipients, immutable applied rate/amounts for initiated transactions, audited changes and idempotent processing. A duplicate provider event or later settlement/withdrawal of the same proceeds must not create another commission. Do not treat an example 10% as an approved default. Commission/payment implementation is still pending in its stories.

For payments, verify provider-signed webhooks, enforce idempotency and replay protection, reconcile asynchronous events, and never trust a client redirect as proof of payment. Do not store card data. For admin actions and sensitive price approvals, record actor, time, and the relevant before/after values.

For security review, state scope, assumptions, concrete findings, severity, exploit path, and remediation. Do not silently broaden access or weaken checks for convenience. Do not run destructive scans or alter production systems without explicit task authorization. Do not expose secrets in reports.

For account deletion, privacy, identity-provider or release-readiness work, consult `docs/pendientes-publicacion.md`. Verify relevant current store policies and actual SDK/data behavior when that work is undertaken; distinguish implementation from platform test evidence. Apple login remains deferred. The register records future work, not permission to enable providers, pay Apple/Google developer-program fees or publish.
