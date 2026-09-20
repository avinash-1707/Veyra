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
D-02 deployment provider/topology; D-03 API framework and authentication/session design; D-04 commerce-policy boundary; D-05–D-10 pre-build security and operational controls; D-11 AI provider operational enablement.

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
**Status:** Assumption/open · **D-ID:** D-02, D-03  
**Context:** sources permit Fastify or NestJS and multiple secure session approaches; provider deployment is unspecified.  
**Alternatives considered:** Fastify vs NestJS; cookie session vs token/refresh; managed provider choices.  
**Decision:** no selection yet.  
**Rationale:** documentation must not invent implementation decisions.  
**Consequences:** U0 owns an evidence-backed selection before production foundations.  
**Doc references:** [architecture §1](../technical-architecture.md#1-architecture-decisions).  
**Revisit trigger:** before API/runtime/deployment implementation.

### ADR-005 — Initial commerce policy boundary
**Status:** Assumption/open · **D-ID:** D-04
**Context:** approved scope requires displayed prices, delivery choices, server totals, simulated checkout, cancellation, returns, and later promotions/coupons. It does not select initial locale/currency, tax representation, promotion semantics, return-window values, or the P0/P1 boundary for related features.
**Alternatives considered:** one fixed locale/currency with deterministic configured policies; multiple locales/jurisdictions at launch; no tax/promotion representation until a later milestone.
**Decision:** no policy selection yet. Support one explicitly configured initial policy rather than infer country, currency, tax, or discount behavior from seed data.
**Decision criteria:** shopper clarity, deterministic calculation, fixture coverage, simulation disclosure, future migration cost, and avoidance of jurisdictional/compliance claims.
**Consequences:** U1 cannot finalize delivery/price display and U2/U3 cannot expose tax, coupon, promotion, quote, or refund calculations until a policy contract exists.
**Evidence required:** owner-approved locale/currency; written tax/shipping/promotion policy; cancellation/return/refund rules; normal and denied fixtures; decision on simulated disclosures.
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
**Decision:** U0 must establish and test one common baseline before public/authenticated endpoints, uploads, privileged operations, production data collection, or launch. It covers identity/session/browser protections (D-05), abuse and AI cost controls (D-06), privacy and provider-data lifecycle (D-07), internal roles (D-08), media safety (D-09), and recovery/on-call operations (D-10).  
**Rationale:** these boundaries cross every later domain; retrofitting them after carts, orders, or uploads exist is unsafe and expensive.  
**Consequences:** the specific values and providers remain open, but no implementation may silently select them. U0 exit evidence includes adversarial and recovery-path tests.  
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
**Status:** Assumption/open · **D-ID:** D-11  
**Context:** The reference architecture identifies Gemini as the initial LLM adapter target, while operational readiness still requires credentials, provider terms, region/data-retention posture, quota and cost controls, timeout/circuit-breaker behavior, evaluation thresholds, and fallback configuration.  
**Alternatives considered:** treat Gemini selection as sufficient for implementation; require a separate provider-enablement gate before any production AI use; keep provider unselected.  
**Decision:** Gemini remains the reference initial provider, but provider enablement is not approved until D-11 evidence is documented.  
**Rationale:** provider choice and safe operation are different decisions; credentials, privacy terms, cost ceilings, and reliability behavior affect launch risk.  
**Consequences:** U5 can design against the provider adapter interface, but cannot enable production AI calls until D-07 and D-11 are resolved.  
**Evidence required:** approved provider account and credentials handling; region/retention/training terms; cost and concurrency ceilings; timeout/retry/circuit-breaker policy; evaluation thresholds; fallback and kill-switch behavior.  
**Doc references:** [architecture AI integration](../technical-architecture.md#1-architecture-decisions), [build plan D-11](03_build_plan.md#master-decision-coverage-table).  
**Revisit trigger:** before AI provider calls are enabled outside local/test fixtures.
