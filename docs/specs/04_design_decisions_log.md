# 04 — Design decisions log

**Status:** Living ADR record  
**Last updated:** 2026-09-20  
**Companions:** [architecture](02_system_architecture_spec.md) · [decision coverage](03_build_plan.md#master-decision-coverage-table)  
**Source of truth for:** Why material product and system choices are current.

## What this document is
Current-state specs describe behavior; this log records material alternatives, trade-offs, and revisit conditions.

## Status legend
**Confirmed by owner** = source documents explicitly decide it. **Proposed/adopted** = implementation-ready recommendation accepted by owner. **Assumption/open** = must resolve before named work. **Superseded** = replaced by a successor ADR.

## Open items requiring explicit resolution
D-02 deployment operations details; D-03 API/auth/email hardening details; D-04 commerce-policy boundary; D-05–D-10 pre-build security and operational controls; D-11 AI provider operational enablement.

## Product and architecture ADRs

### ADR-001 — Baseline before AI
**Status:** Confirmed by owner · **D-ID:** D-01  
**Alternatives considered:** AI-first assistant; AI replacing conventional interfaces.  
**Decision:** Build usable conventional consumer flows before AI becomes primary.  
**Rationale:** preserves access and correctness during AI outage and makes improvements measurable.  
**Consequences:** every AI capability calls an existing deterministic flow and has fallback.  
**Doc references:** [PRD §7.1](../PRD.md#71-baseline-parity-gate), [architecture §2.1](../technical-architecture.md#21-baseline-first-implementation-rule).  
**Revisit trigger:** none without a product-scope change.

### ADR-002 — Modular monolith with transactional outbox
**Status:** Confirmed by owner  
**Alternatives considered:** early microservices; event platform/Kafka.  
**Decision:** use one modular codebase with separate API/worker roles and database outbox.  
**Rationale:** ships and operates a consumer marketplace without premature distributed complexity.  
**Consequences:** module boundaries/events must remain explicit; extraction requires measured independent need.  
**Doc references:** [architecture §1](../technical-architecture.md#1-architecture-decisions).  
**Revisit trigger:** a module has independent scale, ownership, deployment, reliability, or security needs.

### ADR-003 — Deterministic commerce and grounded AI
**Status:** Confirmed by owner  
**Alternatives considered:** model-driven price/policy/action decisions; unstructured chatbot.  
**Decision:** code owns money, inventory, orders, returns, permissions; AI only interprets/summarizes supplied evidence and mutations need confirmation.  
**Rationale:** protects commitments and shopper trust.  
**Consequences:** schema validation, rank-factor templates, auditability, and fallbacks are mandatory.  
**Doc references:** [PRD §6](../PRD.md#6-product-principles), [architecture §5.4](../technical-architecture.md#54-grounded-ai-output).  
**Revisit trigger:** none without a security/policy approval.

### ADR-004 — Framework, session, and deployment selection
**Status:** Proposed/adopted · **D-ID:** D-02, D-03  
**Context:** Owner selected pnpm, Vercel for the Next.js web app and the HTTP API, Hono as the TypeScript API framework, Better Auth for authentication, Neon PostgreSQL, Upstash Redis, Qdrant Cloud, Vercel native services for scheduled/background work where suitable, Drizzle ORM with committed SQL migrations, and Nodemailer for verification/password-reset email. Atlas review found no current requirement for WebSockets, SSE, or persistent backend connections; current flows are request/response plus asynchronous outbox work.  
**Alternatives considered:** Fastify vs NestJS vs Hono; cookie session vs token/refresh; custom auth vs Better Auth; managed provider choices including Vercel/Neon/Upstash/Qdrant Cloud; Prisma/TypeORM/Drizzle vs hand-written SQL only; persistent worker process vs serverless/scheduled outbox execution; hosted email provider SDKs vs Nodemailer.  
**Decision:** Use pnpm workspaces with TypeScript strict mode. Use Drizzle ORM with committed SQL migrations. Deploy the Next.js app on Vercel. Implement the separate TypeScript API with Hono and deploy it on Vercel as request/response serverless/edge-compatible HTTP endpoints. Use Better Auth for credentials and Google OAuth with database-backed opaque sessions: 7-day session expiry, 1-day rolling refresh, HTTP-only secure SameSite=Lax cookies, central CSRF/origin/CORS/CSP enforcement, and 15-minute single-use verification/password-reset tokens. Use Nodemailer behind an email adapter; Gmail SMTP is allowed only for local development/prototyping, while production email provider, verified sender domain, and deliverability configuration are deployment-provisioning gates. Use Neon PostgreSQL as source of truth, Upstash Redis for ephemeral/cache/rate-limit/idempotency support, and Qdrant Cloud for non-authoritative semantic retrieval. Keep asynchronous work in the modular monolith, but execute outbox draining, fulfillment simulation, indexing, notifications, and analytics through Vercel native scheduled/background services where suitable rather than assuming a continuously running in-process server on Vercel.  
**Rationale:** Hono fits lightweight TypeScript HTTP APIs on Vercel; Better Auth provides an auth foundation without inventing custom session primitives; database-backed opaque sessions preserve server-side revocation; current product scope does not need persistent client connections. Drizzle plus committed SQL migrations provides typed access while keeping schema changes reviewable and reproducible. Neon, Upstash, and Qdrant Cloud reduce operational burden for the initial marketplace. Qdrant Cloud advertises a free tier appropriate for early development/prototype retrieval, but pricing and limits must be rechecked before production. Serverless deployment preserves baseline simplicity while retaining the outbox boundary.  
**Consequences:** U0/local implementation is not blocked on final deployment topology, API keys, regions, Vercel runtime limits, Cron cadence, production origins, or Google OAuth production callback configuration. Provider configuration remains environment-driven, and production startup must validate required environment variables. Before staging/production deployment, document Vercel/Neon/Upstash/Qdrant regions/environments, function runtime limits, background-job cadence/provider, API deadlines, production CORS/CSRF/CSP origins, production OAuth callbacks, production email provider/domain/deliverability, SLO ownership, and incident runbooks. Realtime notification delivery remains out of scope unless a future ADR adds it.  
**Doc references:** [architecture §1](../technical-architecture.md#1-architecture-decisions), [deployment](../technical-architecture.md#12-deployment), [build plan](03_build_plan.md#master-decision-coverage-table).  
**Revisit trigger:** if a feature requires long-lived connections, continuous workers, non-Vercel runtimes, or framework capabilities Hono cannot satisfy.

### ADR-005 — Initial commerce policy boundary
**Status:** Confirmed by owner · **D-ID:** D-04
**Context:** approved scope requires displayed prices, delivery choices, server totals, simulated checkout, cancellation, returns, and later promotions/coupons. Owner selected dollars as the local currency and confirmed a simple US simulation policy for the rest.
**Alternatives considered:** one fixed locale/currency with deterministic configured policies; multiple locales/jurisdictions at launch; no tax/promotion representation until a later milestone.
**Decision:** use a single United States / USD simulation policy for V1 fixtures. Prices are stored/displayed in USD minor units. Initial values: 8.25% estimated tax line; free standard shipping for eligible carts at or above $35 and $5.99 otherwise; expedited shipping at $12.99 where enabled; standard delivery promise 3–5 simulated business days and expedited 1–2 simulated business days; checkout quote/reservation expiry 15 minutes; cancellation allowed until fulfillment enters shipped/in-transit; return window 30 days from delivered; refund begins after simulated receipt/approval and returns to the mock payment method; P0 promotions support only configured checkout codes/discount fixtures, while shopper-facing deal discovery/coupon claiming stays P1.
**Decision criteria:** shopper clarity, deterministic calculation, fixture coverage, simulation disclosure, future migration cost, and avoidance of jurisdictional/compliance claims.
**Consequences:** U1–U4 can implement against one explicit policy once fixtures are created. UI copy must label tax, delivery, shipment, payment, and refund behavior as simulated estimates, not real-world commitments.
**Evidence required:** normal and denied fixtures for tax/shipping/promotion/cancellation/return/refund/reservation behavior; simulation disclosure copy.
**Doc references:** [PRD §7](../PRD.md#7-scope-and-priorities), [architecture §4.3](../technical-architecture.md#43-transactional-rules), [build plan D-04](03_build_plan.md#master-decision-coverage-table).
**Revisit trigger:** before catalog pricing or checkout implementation, and when adding locale or real commerce integration.

### ADR-006 — Event and contract versioning
**Status:** Proposed requirement; implementation detail open
**Context:** API contracts and outbox events coordinate independently deployed web, API, and worker roles. Unversioned payloads create silent incompatibility during rollout and replay.
**Alternatives considered:** unversioned JSON; versioned schemas with additive evolution; a distributed event platform from the start.
**Decision:** API and event schemas carry an explicit version and evolve additively within a compatible major version. Schema tooling and compatibility gates belong to U0 after D-03 selects the runtime approach.
**Rationale:** preserves replayability and staged deployment without prematurely adopting distributed infrastructure.
**Consequences:** consumers quarantine unsupported versions; producers cannot repurpose field meaning; contract fixtures become release artifacts.
**Doc references:** [architecture §6](../technical-architecture.md#6-api-design), [architecture §8](../technical-architecture.md#8-background-jobs-and-events).
**Revisit trigger:** if independently deployed services are approved.

### ADR-007 — AI evidence remains a first-class contract
**Status:** Confirmed by owner
**Alternatives considered:** prompts without source identifiers; post-hoc citations; free-form chatbot responses.
**Decision:** shopper-visible AI results use a purpose-limited evidence bundle with source identifiers, schema validation, and conventional fallback.
**Rationale:** operationalizes ADR-003 and makes unsupported output detectable in tests and UI.
**Consequences:** U5 owns versioned evidence schemas and evaluation fixtures; unavailable evidence is shown as uncertainty, not filled with model knowledge.
**Doc references:** [PRD §6](../PRD.md#6-product-principles), [architecture §5.4](../technical-architecture.md#54-grounded-ai-output), [system spec AI contract](02_system_architecture_spec.md#ai-evidence-and-safety-contract).
**Revisit trigger:** none without product-security approval.

### ADR-008 — Pre-build security and operational controls
**Status:** Assumption/open · **D-ID:** D-05, D-06, D-07, D-08, D-09, D-10  
**Context:** The reference architecture establishes secure patterns but not the concrete policies needed to safely expose an identity-bearing consumer application.  
**Alternatives considered:** defer policies to individual feature teams; define a common U0 security/operations baseline before feature work.  
**Decision:** U0 must establish and test one common baseline before public/authenticated endpoints, uploads, privileged operations, production data collection, or launch. It covers identity/session/browser protections (D-05), abuse and endpoint/AI timeout controls (D-06), privacy and provider-data lifecycle (D-07), internal roles (D-08), media safety (D-09), and recovery/on-call operations (D-10). App-level AI spend caps are not required because budget is managed in OpenRouter. D-05 has an initial implementation contract: Better Auth database-backed opaque sessions, 7-day expiry, 1-day rolling refresh, HTTP-only secure SameSite=Lax cookies, central CSRF/origin/CORS/CSP enforcement, 15-minute single-use verification/reset tokens, and non-enumerating auth responses.  
**Rationale:** these boundaries cross every later domain; retrofitting them after carts, orders, or uploads exist is unsafe and expensive.  
**Consequences:** D-05 is specific enough for U0/local identity implementation; D-06–D-10 and production hardening values remain open, but no implementation may silently select them. U0 exit evidence includes adversarial and recovery-path tests.  
**Doc references:** [security gates](02_system_architecture_spec.md#pre-build-security-and-abuse-controls), [build plan](03_build_plan.md#master-decision-coverage-table).  
**Revisit trigger:** each D-ID is replaced with a dedicated confirmed ADR when its policy is selected; the common baseline remains required.

### ADR-009 — Direct customer self-service is P0
**Status:** Confirmed by owner  
**Context:** The parity inventory classified customer service as baseline while the PRD previously placed it in P1.  
**Alternatives considered:** defer all customer service to P1; deliver direct deterministic self-service as P0 and retain AI support as a later enhancement.  
**Decision:** The P0 lifecycle includes a help hub and authenticated order-specific tracking, cancellation, return, and refund self-service. Contact entry and issue timeline are included; AI support remains P1b.  
**Rationale:** direct post-purchase resolution is part of baseline consumer parity and does not require AI.  
**Consequences:** U4 is P0 work after U3; support mutations retain confirmation, policy, ownership, and audit requirements.  
**Doc references:** [PRD P0](../PRD.md#7-scope-and-priorities), [inventory §5](../amazon-baseline-inventory.md#5-orders-fulfillment-and-post-purchase-support), [U4](03_build_plan.md#u4--returns-reviews-and-support).  
**Revisit trigger:** only a product-scope change approved by the owner.

### ADR-010 — AI provider operational enablement
**Status:** Proposed/adopted · **D-ID:** D-11  
**Context:** Owner selected OpenRouter for LLM access and wants timeout limits in the app while budget controls are managed from OpenRouter. Atlas recommended `google/gemini-2.5-flash-lite` as the cheap, efficient initial model for Veyra's constrained intent parsing, compact grounded summaries, and rank-explanation wording; `openai/gpt-4.1-mini` or a current equivalent is the backup candidate when stricter JSON/instruction reliability is worth extra cost. Operational readiness still requires credentials, provider terms, model routing policy, region/data-retention posture, timeout/circuit-breaker behavior, evaluation thresholds, and fallback configuration.  
**Alternatives considered:** direct Gemini adapter; OpenRouter gateway adapter; lowest-cost Gemini Flash-Lite model; OpenAI mini-class backup model; treat provider selection as sufficient for implementation; require a separate provider-enablement gate before any production AI use.  
**Decision:** Use OpenRouter as the initial LLM access layer behind Veyra's provider adapter. Configure `google/gemini-2.5-flash-lite` as the initial candidate model and keep the model ID configurable, not hard-coded. Keep an approved backup model slot such as `openai/gpt-4.1-mini` or current equivalent. Provider enablement is not approved until D-11 evidence is documented.  
**Rationale:** OpenRouter preserves model flexibility while retaining the existing adapter boundary and deterministic fallbacks. A low-cost, fast model is appropriate because Veyra's AI cannot make commerce decisions and must operate over constrained evidence with validated schemas. Provider choice and safe operation remain different decisions; credentials, privacy terms, timeout behavior, and reliability affect launch risk.  
**Consequences:** U5 can design against an OpenRouter-backed provider adapter, but cannot enable production AI calls until D-07 and D-11 operational evidence is resolved. Application code enforces request timeouts and fallback; spend caps are configured in OpenRouter.  
**Evidence required:** approved OpenRouter account and credentials handling; provider and downstream model retention/training terms; configurable model allowlist/routing policy; timeout/retry/circuit-breaker policy; evaluation thresholds; fallback and kill-switch behavior.  
**Doc references:** [architecture AI integration](../technical-architecture.md#1-architecture-decisions), [build plan D-11](03_build_plan.md#master-decision-coverage-table).  
**Revisit trigger:** before AI provider calls are enabled outside local/test fixtures, or when bypassing OpenRouter for a direct model provider.
