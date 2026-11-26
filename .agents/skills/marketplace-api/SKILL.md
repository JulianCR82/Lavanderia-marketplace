---
name: marketplace-api
description: Implement or change the lavanderia marketplace NestJS API, including modules, endpoints, validation, authorization, and database-backed business logic. Use for work in apps/api; do not use for isolated mobile UI or payment-provider decisions.
---

# Marketplace API

Read `docs/historias-usuario.md` before feature work and select the earliest unblocked atomic story, respecting priority and dependencies. Keep its full ID (for example `US-001.01`) and acceptance criteria in implementation notes across API, data, and client work. Parent IDs are grouping references, not independently completable stories. Also read root `AGENTS.md`, `docs/mvp.md`, `docs/requisitos.md`, and `docs/agents/backend.md`.

Keep business rules in NestJS services so mobile and admin clients share the same behavior. Use controllers for HTTP boundaries, DTO validation for untrusted input, and `DatabaseService` for parameterized SQL. Do not concatenate user input into SQL. Model errors without returning stack traces, SQL, credentials, or provider secrets.

Read `docs/decisiones-modelo-comercial.md` for approved account and revenue rules. Laundry roles are only `OWNER` and `STAFF`; `laundry_memberships` represents access, not a paid membership. Accepting an OWNER's invitation with explicit confirmation converts the same customer account to exclusive work (`account_kind: CUSTOMER → LAUNDRY`), preserves identity/history and revokes previous sessions. Work accounts cannot use customer functions even if their historical `platform_role` is `CUSTOMER`; removing memberships does not restore customer access. Do not require another email/account, add a customer/work switch, or grant platform admins implicit laundry access. OWNER self-registration remains pending in US-002.01.

Revenue is a commission on each service payment received by the laundry, using one global rate configurable only by `PLATFORM_ADMIN`. There is no laundry subscription or recurring access fee; 10% is only an example. A later settlement, withdrawal or bank transfer of the same proceeds is not another commissionable service payment. Preserve the applied rate and amounts per payment and audit rate changes without rewriting initiated transactions. Commission/payment implementation remains pending in US-013 and US-014.05; consult the approved rules before implementing those stories.

Derive the authenticated account and laundry memberships from trusted server-side authentication context. For every read and write, enforce resource ownership and role in the backend; a client-supplied laundry ID is only a selector and never proof of access. Keep platform-admin powers explicit and auditable.

Keep payment and order states separate; make externally retried writes idempotent. Preserve accepted catalog and price terms in order snapshots. Never infer unresolved rules for availability, payment adjustment, refunds, tenant onboarding, or multi-laundry orders. If a technical choice materially changes the agreed payment or access flow, document the impact and pause that dependent implementation for product input.

Add focused tests for changed behavior, especially tenant isolation, authorization boundaries, state transitions, and idempotency. Avoid touching unrelated files and preserve user changes.

For account lifecycle, privacy or production-readiness work, consult `docs/pendientes-publicacion.md`. Account deletion and its active-order/payment handling and production operations remain planning items; preserve the implemented session-revocation controls. Define unresolved lifecycle rules before implementation. Do not implement deferred items as a side effect of an unrelated endpoint change.
