---
name: marketplace-mobile
description: Build or change the React Native and Expo client for customers and laundry staff, including navigation, API integration, forms, and mobile behavior. Use for apps/mobile; do not use for backend rules or the unselected web-admin framework.
---

# Marketplace mobile client

Read `docs/historias-usuario.md` and select the earliest unblocked atomic story involving mobile UI, respecting priority and dependencies. Keep its full ID (for example `US-005.01`) and acceptance criteria in implementation notes; parent IDs are grouping references. Also read root `AGENTS.md`, `apps/mobile/AGENTS.md`, `docs/mvp.md`, `docs/requisitos.md`, and `docs/agents/frontend.md`. Follow the Expo documentation version required by the local mobile instructions before using Expo or React Native APIs.

For product UI, follow the local `expo-design-system` skill (`../expo-design-system/SKILL.md`) and its Expo references for styling, components, layout, and motion. The only retained product-specific visual constraint is the palette in `docs/brand.md`, backed by `Colors.light`/`Colors.dark` in `apps/mobile/src/constants/theme.ts`. Keep one existing token system; the current shape and motion values are implementation details that may evolve with the Expo guidance. Follow root pnpm commands and `apps/mobile/AGENTS.md` for SDK-specific APIs when upstream examples use other commands or versions.

Use Expo Router routes in `apps/mobile/src/app`; keep reusable UI and data code outside the route tree. Use pnpm and SDK-compatible Expo dependency installation. Preserve Android and iOS support, accessible Spanish interfaces, loading/error/empty states, and resilient network behavior.

Treat the API as the authority for permissions, prices, availability, order transitions, and payment confirmation. Clearly label estimated versus final amounts and obtain explicit customer approval for a price difference before initiating final charge. Prevent accidental duplicate submissions, but rely on backend idempotency for financial safety. Never bundle credentials or secrets in `EXPO_PUBLIC_*`.

Read `docs/decisiones-modelo-comercial.md` for current account and revenue rules. Customers and laundry workers share the app, with exclusive customer or work accounts. Laundry roles are only `OWNER` and `STAFF`. Accepting an OWNER's STAFF invitation explicitly converts the same customer account to work (`accountKind: LAUNDRY`), preserving email/credentials/history and replacing its sessions. Explain the loss of customer functions and request confirmation. Do not require another account/email, offer a customer/work switch or restore customer functions when memberships are removed. Use `accountKind` as well as platform role; the historical `CUSTOMER` platform role alone does not mean the account can act as a customer. Hiding a screen or control is not authorization.

The platform earns a commission on each service payment received by a laundry, at one global rate configurable only by `PLATFORM_ADMIN`. Laundry memberships are access permissions, not subscriptions. Do not add membership checkout, recurring laundry fees, a fixed 10% rate or another commission on a later settlement/withdrawal of the same proceeds. Future financial views must use server-calculated amounts and the rate applied to the payment. Commission/payment functionality remains pending in its stories.

Do not invent payment, scheduling, delivery-zone, cancellation, or authentication behavior while product decisions are unresolved. The admin web app is a separate application and its framework must be agreed before creation.

For mobile changes, run the project’s relevant lint and TypeScript checks and inspect affected flows on available Android/iOS targets. Do not hand-edit generated native directories.

For account, privacy, platform-validation or release-preparation work, consult `docs/pendientes-publicacion.md`. It records deferred account-deletion/privacy UI, accessibility/network acceptance gaps and separate web/Android/iOS evidence. Preserve the current story scope; this reference does not authorize implementing deferred work, enabling Apple login or publishing. Use the relevant store skill when release work is actually requested.
