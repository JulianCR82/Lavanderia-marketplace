---
name: marketplace-payments
description: Design or implement marketplace service-payment commissions, provider integrations, webhooks, price adjustments, refunds, and laundry settlement. Apply approved commercial rules and resolve remaining provider and financial decisions before integration.
---

# Marketplace payments

Read `docs/historias-usuario.md` and work only on the earliest unblocked atomic payment story, respecting priority and dependencies. Preserve its full ID (such as `US-013.03`) and acceptance criteria. Also read `docs/decisiones-modelo-comercial.md`, `docs/mvp.md`, `docs/requisitos.md`, `docs/agents/payments.md`, and the security skill.

Apply the approved business model: the platform earns a commission on each payment for a laundry service received by that laundry, using one global rate configurable only by `PLATFORM_ADMIN`. There is no paid laundry membership, subscription or recurring access fee. `laundry_memberships` represents access with only `OWNER`/`STAFF`; neither role can configure the global rate. 10%/90% is an example, not an approved fixed or initial rate. Accepting STAFF converts the same customer account to exclusive work; do not reintroduce separate customer/work emails or accounts.

Associate the commission with the service payment, not with an unrelated bank transfer or each later settlement/withdrawal of those same proceeds. Retries and duplicate webhooks must not charge it again. Preserve applied rate and amounts per payment/attempt and audit rate changes without rewriting initiated transactions. The selected provider must distribute the laundry and platform shares directly; the laundry's money must not enter or remain in the platform's bank account for later manual transfer. These are approved requirements, not implemented payment capabilities; commission configuration/calculation and payments remain pending in US-014.05 and US-013.

Before integration, resolve only the remaining decisions: provider, supported countries/currencies/methods, merchant of record, beneficiary onboarding, configured rate value, precision/rounding, application timing, provider fees/taxes, settlement operations, refunds/chargebacks and rejection/no response to a final weight-based price. Do not reclassify the approved commission/direct-split model as undecided or choose unresolved details by inference.

Verify provider capabilities from current official documentation before relying on authorization holds, incremental capture, delayed capture, split payments, refunds, or marketplace payouts. Explain material limits and fees/operational implications to the user. Never promise that a provisional authorization can be increased unless the selected provider and method support it.

Represent order and payment states separately. Verify signed provider webhooks on the server, handle duplicate and out-of-order events idempotently, reconcile uncertain outcomes, and record a traceable link between order, payment attempt, approval, and provider reference. The client return URL is not payment confirmation. Never store raw card data or secrets in the mobile or web client.

Do not process real money, configure live credentials, or make external financial changes unless the user explicitly authorizes that exact operation. Use sandbox flows for development. Preserve audit history for price revisions and customer approvals.
