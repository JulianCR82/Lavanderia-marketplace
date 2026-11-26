---
name: marketplace-data
description: Design PostgreSQL tables, constraints, indexes, SQL queries, and versioned migrations for the multi-laundry marketplace. Use for database or persistence changes; do not use to choose payment policy or implement UI.
---

# Marketplace data and migrations

Read `docs/historias-usuario.md` and select the earliest unblocked atomic story requiring database work, respecting priority and dependencies. Keep its full ID (for example `US-004.01`) and acceptance criteria in migration/task notes; parent IDs are grouping references. Also read root `AGENTS.md`, `docs/requisitos.md`, `docs/mvp.md`, and `docs/agents/database.md`. The API uses PostgreSQL 17 through `pg` and `DatabaseService`; no ORM is selected. Use SQL migrations in `apps/api/migrations` with increasing numeric prefixes and the existing migration runner. Do not edit an applied migration; add a forward migration.

Keep tenant-owned rows associated with a laundry and enforce relationships with foreign keys and appropriate uniqueness/check constraints. Review every query path for tenant scoping. Use UUIDs as identifiers, `timestamptz` for instants, and exact numeric types for money/weights as requirements specify; never use floating point for currency. Avoid storing sensitive payment data or credentials.

Read `docs/decisiones-modelo-comercial.md` before modeling accounts or revenue. `laundry_memberships` is an access relationship with only `OWNER`/`STAFF`, not subscription billing. Applied migration 007 converts legacy `MANAGER` to `STAFF`; migration 008 persists exclusive work accounts (`account_kind: LAUNDRY`). Invitation acceptance converts the same customer account with explicit confirmation, preserving identity/history and revoking old sessions transactionally. Do not add a separate-email requirement or restore customer capabilities when the last membership is removed; preserve the applied migrations.

The approved revenue model is a commission on each service payment received by a laundry, with a global rate configured by `PLATFORM_ADMIN`. When its stories are implemented, preserve the rate and amounts applied to each payment; later rate changes must not rewrite initiated transactions. Model service payments separately from settlement/withdrawal transfers so moving the same proceeds does not create another commission. Do not add laundry subscription plans or a fixed 10% default. Provider, precision/rounding, fees and refund rules remain unresolved; the commission schema and calculation are pending, not implemented by these instructions.

Preserve order snapshots of service name, unit, accepted terms, and price calculation. Represent estimated and final weights, price revisions, approvals, order state, and payment state separately with enough history for support and reconciliation. Do not design schema around an unchosen provider or invent unresolved product rules.

Before applying a migration, inspect its effect on existing data and rollback/recovery implications. Never drop or truncate user data, remove the PostgreSQL volume, or use `docker compose down -v`. Validate SQL on an isolated disposable database when available and verify migration history and query plans when material.

For deletion, anonymization, retention or production backup work, consult `docs/pendientes-publicacion.md`. Retention scope and periods remain unresolved; inspect account/order/payment/audit relationships and agree the applicable rules before a migration. This pending register does not authorize deleting data, changing applied migrations or performing cleanup.
