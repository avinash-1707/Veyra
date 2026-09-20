# Progress tracker

## How to use this file

This is the record of what actually happened, not a restatement of planned work. Add newest-first entries. Every non-trivial decision references an ADR and `D-##`; state whether the change matches or deviates from specification. Resolving a decision updates this log, its ADR, the build-plan coverage row, and the source assumption.

## Unit status at a glance

| Unit | Status | Last updated | Notes |
|---|---|---|---|
| U0 Foundations | Complete for local foundation | 2026-09-20 | Workspace, API/auth/browser protection, Drizzle schema, committed migration, provider adapters, observability, policy fixtures, outbox, worker harness, and verification commands are in place; production deployment gates remain |
| U1 Baseline discovery | Not started | 2026-09-20 | Depends on U0 |
| U2 Product evaluation and cart | Not started | 2026-09-20 | Depends on U1 |
| U3 Checkout and order lifecycle | Not started | 2026-09-20 | Depends on U2 |
| U4 Returns, reviews, support | Not started | 2026-09-20 | Depends on U3 |
| U5 Intelligent shopping | Not started | 2026-09-20 | Depends on U1–U4 baseline contracts |

### External-dependency status

| Dependency | Status | Owner/next action |
|---|---|---|
| LLM provider enablement | OpenRouter selected for LLM access; initial candidate `google/gemini-2.5-flash-lite`, backup `openai/gpt-4.1-mini` or current equivalent; credentials, downstream model policy, provider terms, retention posture, and timeout behavior are not configured/approved | Resolve D-07 and remaining D-11 details before AI provider enablement |
| Hosting and managed services | pnpm workspace, Hono API foundation, Better Auth config, Drizzle schema/migration, Nodemailer adapter, provider descriptors, and local scheduled worker harness are implemented; production region, runtime, job cadence, SLO, incident, OAuth callback, and deliverability details remain open | Resolve remaining D-02/D-03 production details before staging/deployment work |
| Payment/shipping adapters | Simulated by design; US/USD tax/shipping/return/refund/reservation policy confirmed | Create D-04 policy fixtures before shopper pricing/checkout work |

## Decision resolutions at a glance

| Decision | Status | ADR |
|---|---|---|
| D-01 Baseline before AI | Confirmed | ADR-001 |
| D-02 Deployment provider/topology | Partially resolved: pnpm, Vercel, Neon, Upstash, Qdrant Cloud, Vercel native background services selected; operations details open | ADR-004 |
| D-03 API framework and auth/session choices | Sufficient for U0 local build: Hono, Better Auth config, session policy, CSRF/origin/CORS helpers, and Nodemailer adapter boundary implemented; production hardening remains | ADR-004 |
| D-04 Commerce policy boundary | Confirmed: US/USD simulation policy | ADR-005 |
| D-05–D-10 Pre-build security and operational controls | Sufficient for U0 local build; production hardening gates remain | ADR-008 |
| D-11 AI provider operational enablement | Partially resolved: OpenRouter and candidate models selected; operational/model-policy details open | ADR-010 |

## Log

| Date | Unit | Type | Matches spec? | Summary | Affected area | ADR / D-ID | Follow-up |
|---|---|---|---|---|---|---|---|
| 2026-09-20 | U0 | Progress | Yes | Completed U0 local foundation: Better Auth configuration and session constants, origin/CORS/CSRF helpers, central mutation protection, Drizzle schema, committed SQL migration, migration check command, provider adapter descriptors, Nodemailer transport boundary, and local scheduled outbox worker harness. | Auth, database, migrations, providers, worker | ADR-004 / ADR-006 / ADR-008 / D-02 / D-03 / D-05 | Begin U1 baseline discovery next; production deployment still requires provider-specific origins, credentials, regions, callbacks, deliverability, alerting, and restore evidence. |
| 2026-09-20 | U0 | Decision resolution / progress | Yes | Resolved D-06–D-10 for local/prototype U0: route limits, body/deadline ceilings, AI timeout fallback, privacy retention baseline, default-deny operator roles, media quarantine policy, recovery targets, and audited dead-letter replay. Implemented policy fixtures, API body/rate-limit enforcement, production provider env validation, redacted audit/log helpers, and an in-memory outbox drain harness with tests. | Security, operations, observability, outbox | ADR-008 / D-06 / D-07 / D-08 / D-09 / D-10 | Production exposure still requires real provider origins, alert destinations, staffing, and tested provider restore paths. |
| 2026-09-20 | U0 | Progress | Yes | Added versioned API success/error envelope contracts, request ID propagation, baseline security headers, 404/error response handling, and environment validation scaffold requiring app/API origins in production while allowing local development defaults. | API foundation and environment contract | ADR-004 / ADR-006 / ADR-008 / D-02 / D-03 / D-05 | Continue U0 with auth/session integration, CSRF/origin/CORS policy enforcement, database/migration foundation, rate limits, and outbox. |
| 2026-09-20 | U0 | Progress / gap | Yes | Began implementation with pnpm workspace, latest TypeScript strict project references, shared Zod product seed contract, Hono API `/health` and `/v1/products/seed`, Vitest contract/API tests, and runnable `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm verify`. Because current latest TypeScript 7.0.2 is not supported by `typescript-eslint`, lint currently uses a repository source scanner for explicit `any`; unsafe-any typed ESLint remains a follow-up when TS7 support lands or an alternate compatible linter is selected. | Repository foundation and API contract | ADR-004 / ADR-006 / D-02 / D-03 | Continue U0 with auth/security policies, database/migration foundation, outbox, environment validation, and a stronger TS7-compatible lint story. |
| 2026-09-20 | U0 | Decision resolution | Yes | Confirmed D-04 US/USD simulation commerce policy after owner approval: estimated tax, shipping, delivery, reservation, cancellation, return/refund, and P0 promotion boundaries. | Commerce policy | ADR-005 / D-04 | Create normal and denied fixtures plus simulation disclosure copy before shopper pricing/checkout work. |
| 2026-09-20 | U0 | Decision resolution | Yes | Added owner selections: pnpm, Neon PostgreSQL, Upstash Redis, Qdrant Cloud, Vercel native scheduled/background services where suitable, Better Auth credentials + Google OAuth, Nodemailer email, USD, and OpenRouter candidate models. Proposed a simple US simulation commerce policy for D-04 confirmation. | Platform, auth, email, data services, commerce policy, AI provider | ADR-004 / ADR-005 / ADR-010 / D-02 / D-03 / D-04 / D-11 | Define provider regions/runtime/job cadence, Better Auth/Nodemailer hardening, and OpenRouter model/timeout/evaluation policy. |
| 2026-09-20 | U0 | Decision resolution | Yes | Partially resolved platform choices: Vercel for Next.js web and Hono API, Hono for the API framework, Better Auth for authentication foundation, and OpenRouter for LLM access. Atlas verified current scope does not require WebSockets or persistent backend connections; outbox workers still need scheduled/managed execution. | Deployment, API, auth, AI provider | ADR-004 / ADR-010 / D-02 / D-03 / D-11 | Define Vercel regions/runtime limits/background jobs, Better Auth session/CSRF/CORS/CSP details, and OpenRouter operational/model policy before gated implementation. |
| 2026-09-20 | U0 | Gap | Yes | Reconciled architecture-review gaps: corrected D-02 ADR mapping, clarified Gemini enablement as operationally open, normalized offer event naming, and added D-11 AI provider enablement tracking. | Documentation and architecture readiness | ADR-004 / ADR-010 / D-02 / D-11 | Resolve D-02–D-11 before their gated implementation work. |
| 2026-09-20 | U0 | Decision resolution | Yes | Resolved customer-service scope as P0 direct deterministic self-service; AI support remains P1b. | Product scope | ADR-009 | Build U4 after U3. |
| 2026-09-20 | U0 | Gap | Yes | Added D-05–D-10 security, privacy, abuse, operator, media, and recovery gates after pre-build audit. | Architecture and operations | ADR-008 / D-05–D-10 | Resolve before the relevant U0 capability or production launch. |
| 2026-09-20 | U0 | Progress | Yes | Initialized coordinated AI context documentation and repaired PRD inventory link. | Documentation | ADR-001 / D-01 | Resolve open implementation decisions before build. |

**Entry template:** `YYYY-MM-DD | U# | Progress / decision resolution / deviation / gap / external status | Yes / No | summary | area | ADR-### / D-## | follow-up`.
