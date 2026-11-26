---
name: marketplace-payments
description: Design or implement marketplace payment flows, provider integrations, webhooks, price adjustments, refunds, and laundry settlement after the user selects commercial rules and a provider.
---

# Marketplace payments

Read `docs/historias-usuario.md` and work only on the earliest unblocked atomic payment story, respecting priority and dependencies. Preserve its full ID (such as `US-013.03`) and acceptance criteria. Also read `docs/mvp.md`, `docs/requisitos.md`, `docs/agents/payments.md`, and the security skill. Before coding, confirm the provider, supported countries/currencies/payment methods, who is merchant of record, commission and settlement model, refunds, and behavior when a customer rejects a final weight-based price. These are financial and product decisions; do not select them by inference.

Verify provider capabilities from current official documentation before relying on authorization holds, incremental capture, delayed capture, split payments, refunds, or marketplace payouts. Explain material limits and fees/operational implications to the user. Never promise that a provisional authorization can be increased unless the selected provider and method support it.

Represent order and payment states separately. Verify signed provider webhooks on the server, handle duplicate and out-of-order events idempotently, reconcile uncertain outcomes, and record a traceable link between order, payment attempt, approval, and provider reference. The client return URL is not payment confirmation. Never store raw card data or secrets in the mobile or web client.

Do not process real money, configure live credentials, or make external financial changes unless the user explicitly authorizes that exact operation. Use sandbox flows for development. Preserve audit history for price revisions and customer approvals.
