---
name: marketplace-api
description: Implement or change the lavanderia marketplace NestJS API, including modules, endpoints, validation, authorization, and database-backed business logic. Use for work in apps/api; do not use for isolated mobile UI or payment-provider decisions.
---

# Marketplace API

Read `docs/historias-usuario.md` before feature work and select the earliest unblocked atomic story, respecting priority and dependencies. Keep its full ID (for example `US-001.01`) and acceptance criteria in implementation notes across API, data, and client work. Parent IDs are grouping references, not independently completable stories. Also read root `AGENTS.md`, `docs/mvp.md`, `docs/requisitos.md`, and `docs/agents/backend.md`.

Keep business rules in NestJS services so mobile and admin clients share the same behavior. Use controllers for HTTP boundaries, DTO validation for untrusted input, and `DatabaseService` for parameterized SQL. Do not concatenate user input into SQL. Model errors without returning stack traces, SQL, credentials, or provider secrets.

Derive the authenticated account and laundry memberships from trusted server-side authentication context. For every read and write, enforce resource ownership and role in the backend; a client-supplied laundry ID is only a selector and never proof of access. Keep platform-admin powers explicit and auditable.

Keep payment and order states separate; make externally retried writes idempotent. Preserve accepted catalog and price terms in order snapshots. Never infer unresolved rules for availability, payment adjustment, refunds, tenant onboarding, or multi-laundry orders. If a technical choice materially changes the agreed payment or access flow, document the impact and pause that dependent implementation for product input.

Add focused tests for changed behavior, especially tenant isolation, authorization boundaries, state transitions, and idempotency. Avoid touching unrelated files and preserve user changes.

For account lifecycle, privacy or production-readiness work, consult `docs/pendientes-publicacion.md`. Deletion, session revocation, active-order/payment handling and production operations remain planning items; define their applicable rules before implementation. Do not implement these deferred items as a side effect of an unrelated endpoint change.
