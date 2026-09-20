# 03 — Build plan

**Status:** Approved dependency plan  
**Last updated:** 2026-09-20  
**Companions:** [overview](00_project_overview.md) · [architecture](02_system_architecture_spec.md) · [ADRs](04_design_decisions_log.md)  
**Source of truth for:** What is built next, in dependency order, and which decisions remain unresolved.

## How to use this document
Units retire coherent risks; they are not calendar phases. Do not begin a unit with unresolved prerequisites. Update its status in [progress](../progress-tracker.md) when observed work changes.

## Dependency graph at a glance
```mermaid
flowchart LR
U0[U0 Foundations] --> U1[U1 Baseline discovery]
U1 --> U2[U2 Evaluation and cart]
U2 --> U3[U3 Checkout and lifecycle]
U3 --> U4[U4 Returns, reviews, support]
U1 --> U5[U5 Intelligent shopping]
U2 --> U5
U3 --> U5
U4 --> U5
```

## U0 — Foundations and contracts
**Risk retired:** unsafe/untyped boundaries, public-endpoint abuse, and unclear operational choices. **Scope:** implement the selected pnpm + strict TypeScript + Drizzle + committed SQL migrations + Vercel + Hono + Better Auth foundation with Neon PostgreSQL, Upstash Redis, Qdrant Cloud, Nodemailer email adapter, and Vercel native scheduled/background services where suitable; close remaining local U0 security details with ADR updates; establish monorepo/runtime, shared contracts, identity, catalog seed model, migration/outbox foundation, observability, security, privacy, and abuse-control baselines. **Dependencies:** none. **Definition of done:** documented choices are implemented; validated API contract handles authenticated identity and product seed reads; Better Auth opaque-session/CSRF/CORS/CSP contract, rate-limit, internal-role, upload, privacy, backup/restore, and incident controls have policy fixtures; migration/outbox and redacted request logs prove traceable writes; local Vercel-style scheduled worker behavior is testable; repository supplies real pnpm verification commands.

## U1 — Baseline discovery
**Risk retired:** shoppers cannot reliably find available products without AI. **Scope:** category/home, lexical search, URL filters/sort/suggestions, product/variant/offer detail, address-aware simulated delivery. **Dependencies:** U0. **Definition of done:** a shopper can browse/search/filter/sort, see correct authoritative offer availability and delivery simulation, and recover from empty/error/AI-unavailable states.

## U2 — Evaluation and cart
**Risk retired:** selection and cart data are not offer/variant-correct. **Scope:** comparison table, reviews/Q&A browsing, related products, persistent offer/variant cart, save-for-later, server totals. **Dependencies:** U1. **Definition of done:** shopper compares up to three factsheets, changes cart items or saves/restores an item for later, and sees correct server-calculated subtotal/discount/shipping/tax representation with no float money handling.

## U3 — Checkout and order lifecycle
**Risk retired:** duplicate/oversold/unauditable orders. **Scope:** address/payment mock selection, quote/confirm, transactional reservation, immutable order snapshots, fulfillment/tracking, policy-gated cancellation and pre-fulfillment address/delivery edit simulation. **Dependencies:** U2. **Definition of done:** authenticated shopper completes one idempotent checkout; concurrency failure is recoverable; policy-gated edits/cancellation and order timeline/audit/outbox prove lifecycle behavior.

## U4 — Returns, reviews, and support
**Risk retired:** post-purchase actions bypass eligibility or mutate without consent. **Scope:** delivered-item review eligibility, returns/refunds, help hub/order-specific self-service, and issue timeline. **Dependencies:** U3. **Definition of done:** delivered eligible item can receive a verified review or valid return; authenticated shopper can directly track, cancel, return, or inspect a refund; ineligible action explains why; support proposal requires explicit confirmation and records audit/history.

## U5 — Intelligent shopping
**Risk retired:** AI can be unsupported or degrade baseline behavior. **Scope:** intent parsing, hybrid retrieval, deterministic rank explanations, fact-grounded comparison/review intelligence, transparent personalization, support guidance. **Dependencies:** U1–U4. **Definition of done:** fixed evaluation queries show valid interpreted constraints, no unsupported claims, editable guidance, measurable fallback, and unchanged conventional flow completion.

## Master decision-coverage table

| D-ID | Decision / assumption | Source | Owning unit | Status | Resolution target |
|---|---|---|---|---|---|
| D-01 | Conventional baseline precedes AI | PRD §7.1 | U0–U5 | Confirmed | Enforce throughout |
| D-02 | pnpm, Vercel web/API, Neon PostgreSQL, Upstash Redis, Qdrant Cloud, and Vercel native scheduled/background services selected; final regions, runtime limits, environment topology, job cadence, SLO ownership are pre-staging/production gates | 00 / 02 / ADR-004 | U0 | Sufficient for U0 local build | Before staging/production deployment |
| D-03 | Hono, Drizzle, committed SQL migrations, Better Auth credentials + Google OAuth, database-backed opaque sessions, and Nodemailer adapter selected; production email/OAuth/origin details are deployment gates | 00 / 02 / ADR-004 | U0 | Sufficient for U0 local build | Before staging/production deployment |
| D-04 | US/USD simulation policy confirmed: estimated tax, shipping, cancellation, return/refund, reservation, and P0 promotion fixtures | 00 / 02 / ADR-005 | U1–U4 | Confirmed | Build corresponding fixtures before shopper flow |
| D-05 | Better Auth opaque sessions: 7-day expiry, 1-day rolling refresh, HTTP-only secure SameSite=Lax cookies, central CSRF/origin/CORS/CSP, 15-minute single-use verification/reset tokens | 00 / 02 / ADR-008 | U0 | Sufficient for U0 local build | Harden before public/staging deployment |
| D-06 | Local/prototype rate-limit, abuse, fraud-signal, endpoint deadline, body/pagination ceiling, limiter-failure, and AI timeout/fallback policy adopted; app spend caps are managed in OpenRouter | 00 / 02 / ADR-008 | U0 | Sufficient for U0 local build | Harden before public/staging exposure |
| D-07 | Local/prototype data classification, 180-day behavior analytics retention, provider-data minimization, and production export/deletion/incident gates adopted | 00 / 02 / ADR-008 | U0 | Sufficient for U0 local build | Before production data collection/provider enablement |
| D-08 | Default-deny internal roles and audit policy adopted for catalog, moderation, support, dead-letter replay, migration, and audit-log access | 00 / 02 / ADR-008 | U0 | Sufficient for U0 local build | Before operational capabilities are exposed |
| D-09 | Media quarantine, allowlisted MIME/magic validation, scan/moderation status, metadata stripping, size ceiling, and signed URL isolation policy adopted | 00 / 02 / ADR-008 | U0 | Sufficient for U0 local build | Before media uploads are exposed |
| D-10 | Local/prototype backup/restore, 24-hour RPO, 4-hour RTO target, quarterly restore test, authorized dead-letter replay, and pre-launch alert/on-call gates adopted | 00 / 02 / ADR-008 | U0 | Sufficient for U0 local build | Before production launch |
| D-11 | OpenRouter selected for LLM access; initial candidate `google/gemini-2.5-flash-lite`, backup `openai/gpt-4.1-mini` or current equivalent; credentials, model allowlist/routing, terms, retention posture, timeouts, fallback, and evaluation thresholds remain open | 00 / 02 / ADR-010 | U5 | Partially resolved | Before AI provider enablement |

When a D-ID resolves, update this row, its ADR, the original `[Assumption]`, and the progress log together.

## U0 decision checklist

Before U0 implementation, close or explicitly sequence the foundation decisions below without silently selecting defaults:

- D-02: pnpm, Vercel, Neon, Upstash, Qdrant Cloud, and Vercel native scheduled/background services are selected. Final region, topology, environments, outbox cadence, runtime limits, SLO/RPO/RTO ownership, and incident runbooks are pre-staging/production deployment gates, not U0/local coding blockers.
- D-03: Hono, Drizzle, committed SQL migrations, Better Auth credentials + Google OAuth, and Nodemailer behind an adapter are selected. Gmail SMTP is local/prototype only; production provider/domain/deliverability is a deployment gate. API envelope and error contracts remain U0/local work.
- D-05: implement Better Auth database-backed opaque sessions with 7-day expiry, 1-day rolling refresh, HTTP-only secure SameSite=Lax cookies, central CSRF/origin/CORS/CSP enforcement, 15-minute single-use verification/reset tokens, and non-enumerating auth responses.
- D-06: endpoint rate limits, abuse controls, fraud-signal logging, body/pagination ceilings, endpoint deadlines, limiter-failure behavior, and AI timeout/fallback are adopted for local/prototype implementation; app-level AI budget caps are managed in OpenRouter.
- D-07: data classification, retention/deletion/export, provider-data handling, and incident-response baseline is adopted for local/prototype implementation; production procedures remain launch gates.
- D-08: internal roles, privileged access, break-glass behavior, and audit requirements are adopted as default-deny local/prototype fixtures.
- D-09: media validation, scanning/quarantine, moderation, publication, and takedown policy is adopted as a local/prototype fixture before upload work.
- D-10: backup/restore, dead-letter replay, alerting, on-call, and launch operations policy is adopted for local/prototype fixtures; real providers and staffing remain production gates.

D-04 is confirmed, but each corresponding flow still needs policy fixtures before implementation. Unresolved D-11 operational details may be sequenced later only where U0 contracts avoid implying production AI-provider behavior.

## Work packages and exit evidence
### U0 — Foundations and contracts
**Work packages:** pnpm repository/environment contract; strict TypeScript and no-`any` lint contract; Vercel app/API/runtime configuration suitable for local build; environment-driven provider configuration with startup validation for required production variables; Neon/Upstash/Qdrant Cloud integration adapters; Drizzle schema and committed SQL migration discipline; Hono API foundation; Better Auth credentials + Google OAuth with database-backed opaque sessions; Nodemailer email adapter with Gmail SMTP local/prototype transport only; central session/CSRF/origin/CORS/CSP enforcement; API envelope and shared schemas; rate-limit/abuse controls; operator-role boundary; data/privacy and media policy; seeded catalog read path; request correlation/redaction; outbox producer/consumer harness using Vercel native scheduled/background execution where suitable; backup/restore and incident runbooks; local and staging verification commands.
**Exit evidence:** validated identity and product-read contract; cross-user, enumeration, CSRF/origin, CORS, CSP, limiter-failure, upload-abuse, prompt-injection, and dependency/secret-scan fixtures; committed SQL migration/outbox traceable writes; tested local/scheduled outbox draining and authorized replay; tested restore path; redacted request logs; real repository commands for typecheck, lint, tests, and migrations.
**Blocked by:** production exposure still requires provider-specific origins, credentials, deployment regions, runtime limits, alert destinations, staffing/on-call ownership, production email/OAuth deliverability, and tested provider restore paths. U0/local implementation is not blocked by final deployment topology, API keys, regions, Vercel runtime limits, Cron cadence, production origins, or Google OAuth production callback configuration; those remain pre-staging/production deployment gates.

### U1 — Baseline discovery
**Work packages:** catalog publication fixtures; lexical retrieval/filter/sort; URL round trip; offer/variant selection; authoritative availability; delivery adapter; empty/error/degraded states; search instrumentation.
**Exit evidence:** fixture coverage for hard filters, selected-offer changes, no results, address absent, and withdrawn/unavailable offers; conventional browsing works without AI.
**Blocked by:** D-04 policy fixtures for locale/currency and delivery/price representation.

### U2 — Evaluation and cart
**Work packages:** normalized factsheets; review/question reads; cart ownership and merge policy; offer/variant mutations; revalidation; deterministic totals; promotion boundary; accessible compare/cart states; mutation idempotency.
**Exit evidence:** tests cover same-product different-offer handling, changed availability, duplicate cart-command replay, missing comparison data, and money calculation invariants.
**Blocked by:** D-04 policy fixtures before tax, discount, coupon, or promotion behavior is exposed.

### U3 — Checkout and lifecycle
**Work packages:** mock payment/address selection; quote expiry; confirmation; reservation transaction; immutable snapshots; fulfillment worker; order tracking; cancellation policy; receipt/audit history.
**Exit evidence:** integration tests exercise competing checkout attempts for limited stock, confirmation replay, quote expiry, payment failure, and cancellation state policy.
**Blocked by:** D-04 policy fixtures and documented simulated payment/shipping behavior.

### U4 — Returns, reviews, and support
**Work packages:** delivered-item eligibility; review moderation/reporting; return/refund/replacement transitions; support read tools; confirmable action proposals; notifications; audit/ownership tests.
**Exit evidence:** cross-user denial, duplicate review prevention, expired/previous return handling, replay-safe support confirmation, and AI-unavailable conventional routes are proven.
**Blocked by:** explicit return-window, replacement, refund, moderation, and notification policies.

### U5 — Intelligent shopping
**Work packages:** taxonomy/schema versions; indexing pipeline; retrieval/ranker fixtures; intent parsing; evidence bundles; template-first explanations; comparison/review evaluation; support-tool allowlist; provider fallback; AI telemetry.
**Exit evidence:** fixed evaluations measure valid-schema rate, hard-constraint accuracy, evidence coverage, unsupported-claim rate, latency, and fallback behavior. A baseline path never depends on an AI response.
**Blocked by:** remaining D-11 details for OpenRouter credentials, downstream model policy, provider terms, timeout/circuit-breaker behavior, fallback behavior, and versioned U5 configuration choices. Spend caps are managed in OpenRouter.

## Cross-unit controls
Every unit produces source contracts, policy-branch fixtures, happy-path and failure-path evidence, observability additions, accessibility coverage for new shopper surfaces, and a progress-tracker entry. Rollback disables the introduced capability without losing committed commerce records and retains enough audit/log information to safely replay asynchronous work. Database migrations require forward-compatible sequencing and a tested restore/rollback procedure before production.
