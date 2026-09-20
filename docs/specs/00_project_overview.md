# 00 — Project overview

**Status:** Approved planning baseline  
**Last updated:** 2026-09-20  
**Companions:** [UX flows](01_product_ux_flow_spec.md) · [architecture](02_system_architecture_spec.md) · [decisions](04_design_decisions_log.md)  
**Source of truth for:** What Veyra is, why it exists, and its approved scope.

## One-line summary
Veyra is a consumer marketplace that completes conventional commerce journeys first and uses explainable AI to reduce shopping uncertainty.

## Problem
Shoppers translate real needs into filters, manually reconcile listings, reviews, offers, and delivery promises, then manage post-purchase issues through disconnected flows.

## Solution / core insight
Pair conventional category/search, evaluation, cart, checkout, tracking, and returns with optional natural-language intent, transparent ranking, grounded comparison/review summaries, and confirmation-based support. AI resolves ambiguity; deterministic systems make commitments.

## Target users
- **Shopper:** discovers, evaluates, and buys an item.
- **Returning shopper:** revisits history, lists, orders, and recommendations.
- **Support seeker:** tracks, cancels, returns, replaces, or understands a refund.

## Product pillars
Consumer-first scope; evidence over magic; complete vertical slices; progressive complexity; honest simulation. Details: [PRD §6](../PRD.md#6-product-principles).

## V1 scope
The P0 baseline is home/category discovery, conventional search/filter/sort, product/offer/variant detail, comparison, persistent cart, mock checkout, order confirmation/tracking, reviews/Q&A, and returns/refunds. AI enhancements are enabled only after their conventional counterpart works. See [PRD §7](../PRD.md#7-scope-and-priorities).

## Non-goals
Seller tools, B2B procurement, real payments/card storage, live carriers, Amazon-scale infrastructure, third-party autonomous purchasing, and ungrounded chat are excluded. See [PRD §4](../PRD.md#4-non-goals).

## Foundational decisions already locked
Baseline-before-AI, a consumer-only scope, simulated logistics/payments, server-authoritative commerce state, and grounded/confirmable AI are confirmed. See [architecture](02_system_architecture_spec.md) and [ADR-001](04_design_decisions_log.md#adr-001-baseline-before-ai).

## Success metrics
Search-to-detail, detail-to-cart, cart-to-order, compare-to-cart, intent correction, no-result, return completion, support resolution, and API latency. See [PRD §10](../PRD.md#10-success-measures).

## Risks & external dependencies
Catalog quality, delivery-rule realism, provider availability, retrieval quality, privacy controls, and inventory concurrency affect correctness. External deployment and framework/auth choices remain open in [D-02–D-03](03_build_plan.md#master-decision-coverage-table); AI provider operational enablement remains open in [D-11](03_build_plan.md#master-decision-coverage-table).

## Glossary
**Offer:** seller-specific price, condition, stock, and delivery terms. **Variant:** selectable product configuration. **Baseline:** usable non-AI equivalent. **Outbox:** transactional event record consumed by workers.

## Open questions still to validate
- **[Assumption] D-02:** managed deployment provider and production topology are unspecified; resolve before deployment implementation.
- **[Assumption] D-03:** Fastify versus NestJS and exact session/auth mechanism are unspecified; resolve before API foundations.
- **[Assumption] D-04:** initial locale/currency is one supported configuration; exact policy needs confirmation before catalog and tax implementation.
- **[Assumption] D-05:** authentication, session, CSRF, CORS, and account-recovery contract must be selected before identity implementation.
- **[Assumption] D-06:** rate-limit, abuse, and AI-cost policy must be selected before any public or authenticated endpoint is exposed.
- **[Assumption] D-07:** data classification, retention, deletion/export, and incident-response policy must be approved before production personal/behavioral data collection.
- **[Assumption] D-08:** internal operator roles and privileged-access controls must be selected before catalog/moderation/operations tooling exists.
- **[Assumption] D-09:** media-upload validation, quarantine, scanning, and publication policy must be selected before uploads are enabled.
- **[Assumption] D-10:** backup/restore, RPO/RTO, monitoring, and incident ownership must be selected before production launch.
- **[Assumption] D-11:** Gemini is the reference initial LLM provider, but credentials, terms, region/retention posture, quotas, cost controls, fallback behavior, and evaluation thresholds must be approved before provider-backed AI is enabled.

## Product boundary and operating model
Veyra is a consumer shopping surface over a curated, simulated marketplace. It presents seller offers and fulfillment data to shoppers, but does not expose seller, warehouse, payment-processor, or carrier operational tools. "Marketplace" describes the consumer offer model; it does not imply multi-tenant seller administration or real settlement in V1.

The initial release uses seeded catalog, stock, delivery, payment, notification, and support data. UI copy must distinguish a simulation from a real financial, delivery, or seller commitment. A simulated state is still required to obey the same internal policy, authorization, audit, and transition rules as its production analogue.

## Scope guardrails
- A shopper can browse publicly, but any account-owned state or mutation requires authenticated ownership checks.
- AI may explain retrieved facts and propose an existing action; it cannot select the final price, override stock or policy, or mutate commerce state without the shopper confirming a deterministic action.
- P0 is the core shopping and post-purchase loop, including direct authenticated order self-service for tracking, cancellation, returns, and refunds. P1 entries remain planned parity work, not an implicit requirement for the first deployable slice.
- The current PRD/inventory distinction around promotions, coupons, saved payment methods, and related P1 surfaces remains subject to D-04 and release sequencing; no team should infer a policy from a screen placeholder.

## Expanded glossary
| Term | Meaning |
|---|---|
| **Product** | Canonical shopper-facing item independent of a particular seller, price, or stock position. |
| **Variant** | A purchasable configuration of a product, selected by normalized attributes such as colour, size, capacity, or configuration. |
| **Offer** | Seller-specific price, condition, stock, and delivery terms for a variant. An offer, not a product alone, is what enters a cart. |
| **Availability** | Authoritative quantity currently eligible to sell after committed and active reserved quantities are considered. |
| **Reservation** | A short-lived inventory hold created during checkout. It either becomes an order allocation or is released through expiry, failure, or cancellation. |
| **Quote** | Server-calculated checkout view containing selected address, items, totals, policies, and expiry. A quote is not an order. |
| **Order snapshot** | Immutable record of the items, prices, discounts, tax, address, delivery choice, and policy results accepted at confirmation time. |
| **Shipment** | Item-level simulated fulfillment record and timeline. One order may contain more than one shipment. |
| **Return request** | Policy-gated, item-level post-delivery request that can lead to a replacement or refund outcome. |
| **Verified purchase** | Review eligibility derived from a delivered order item owned by the reviewer; it is not a shopper-selected label. |
| **Evidence** | An identified, allowed catalog, review, policy, or tool-result fact supplied to an AI capability and available for inspection in the resulting experience. |

## Resolution protocol
An open decision is not resolved by an implementation default. Before a `D-##` changes state, record the chosen option and evidence in the ADR log, update its build-plan coverage row, replace the originating assumption with the current fact, and add an execution entry in the progress tracker. A material change to the product boundary, commerce policy, data authority, or AI trust model requires a new ADR before implementation.
