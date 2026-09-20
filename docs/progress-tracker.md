# Progress tracker

## How to use this file

This is the record of what actually happened, not a restatement of planned work. Add newest-first entries. Every non-trivial decision references an ADR and `D-##`; state whether the change matches or deviates from specification. Resolving a decision updates this log, its ADR, the build-plan coverage row, and the source assumption.

## Unit status at a glance

| Unit | Status | Last updated | Notes |
|---|---|---|---|
| U0 Foundations | Not started | 2026-09-20 | Documentation-only repository |
| U1 Baseline discovery | Not started | 2026-09-20 | Depends on U0 |
| U2 Product evaluation and cart | Not started | 2026-09-20 | Depends on U1 |
| U3 Checkout and order lifecycle | Not started | 2026-09-20 | Depends on U2 |
| U4 Returns, reviews, support | Not started | 2026-09-20 | Depends on U3 |
| U5 Intelligent shopping | Not started | 2026-09-20 | Depends on U1–U4 baseline contracts |

### External-dependency status

| Dependency | Status | Owner/next action |
|---|---|---|
| LLM provider enablement | Gemini is the reference initial provider; credentials, provider terms, region/retention posture, quotas, and cost controls are not configured/approved | Resolve D-07 and D-11 before AI provider enablement |
| Hosting and managed services | Not selected | Resolve D-02 before deployment work |
| Payment/shipping adapters | Simulated by design | Keep mock-only until future trigger |

## Decision resolutions at a glance

| Decision | Status | ADR |
|---|---|---|
| D-01 Baseline before AI | Confirmed | ADR-001 |
| D-02 Deployment provider/topology | Open | ADR-004 |
| D-03 API framework and auth/session choices | Open | ADR-004 |
| D-04 Commerce policy boundary | Open | ADR-005 |
| D-05–D-10 Pre-build security and operational controls | Open | ADR-008 |
| D-11 AI provider operational enablement | Open | ADR-010 |

## Log

| Date | Unit | Type | Matches spec? | Summary | Affected area | ADR / D-ID | Follow-up |
|---|---|---|---|---|---|---|---|
| 2026-09-20 | U0 | Gap | Yes | Reconciled architecture-review gaps: corrected D-02 ADR mapping, clarified Gemini enablement as operationally open, normalized offer event naming, and added D-11 AI provider enablement tracking. | Documentation and architecture readiness | ADR-004 / ADR-010 / D-02 / D-11 | Resolve D-02–D-11 before their gated implementation work. |
| 2026-09-20 | U0 | Decision resolution | Yes | Resolved customer-service scope as P0 direct deterministic self-service; AI support remains P1b. | Product scope | ADR-009 | Build U4 after U3. |
| 2026-09-20 | U0 | Gap | Yes | Added D-05–D-10 security, privacy, abuse, operator, media, and recovery gates after pre-build audit. | Architecture and operations | ADR-008 / D-05–D-10 | Resolve before the relevant U0 capability or production launch. |
| 2026-09-20 | U0 | Progress | Yes | Initialized coordinated AI context documentation and repaired PRD inventory link. | Documentation | ADR-001 / D-01 | Resolve open implementation decisions before build. |

**Entry template:** `YYYY-MM-DD | U# | Progress / decision resolution / deviation / gap / external status | Yes / No | summary | area | ADR-### / D-## | follow-up`.
