# 05 — Future improvements / v2

**Status:** Deliberate deferrals  
**Last updated:** 2026-09-20  
**Companions:** [overview](00_project_overview.md) · [ADRs](04_design_decisions_log.md) · [baseline inventory](../amazon-baseline-inventory.md)  
**Source of truth for:** Work intentionally deferred because required evidence, economics, or permissions are absent.

## Scope of this document
This is not an unfinished-MVP backlog. Items move here only when building them now would be unsafe, uneconomical, unsupported by evidence, or externally blocked. Promote an item only after its stated trigger.

## Real-user or design evidence needed

### Rich visual discovery, voice, and expanded Q&A
Natural-language and conventional discovery must first demonstrate successful search/evaluation; building more modalities now adds data and accessibility complexity without evidence of demand. Related: [ADR-001](04_design_decisions_log.md#adr-001-baseline-before-ai).  
**Trigger:** measured baseline search failure or validated research shows a target task cannot be completed by text/facets, with an accessible interaction design approved.

### Price-history visualization and alert rules
Price events, trust language, and user demand need validation before presenting potentially misleading trends.  
**Trigger:** retained price-event history covers the proposed categories and research shows an alert/history feature improves decision or return outcomes.

### Rich personalization and automated recommendations
Personalization needs privacy controls and enough behavior quality to avoid irrelevant or opaque ranking.  
**Trigger:** opt-in event data and evaluation show improvement over conventional modules while satisfying stated privacy controls.

## Cost or scale crossover needed

### Microservice extraction and distributed event platform
The modular monolith/outbox is the approved initial architecture; early extraction adds operational cost without evidence. Related: [ADR-002](04_design_decisions_log.md#adr-002-modular-monolith-with-transactional-outbox).  
**Trigger:** measured independent scale, ownership, deployment, reliability, or security need exceeds modular-monolith capacity, with an extraction ADR.

### Real-time carrier and warehouse integrations
Simulation is sufficient to validate customer flows; live integration needs operational ownership and accuracy guarantees.  
**Trigger:** a validated fulfillment partner, SLA owner, reconciliation design, and demonstrated demand for real fulfillment.

## External permission or platform constraints

### Real payment acquiring and stored payment credentials
Handling card data or payment rails is excluded until compliance, provider contracts, and security operations exist.  
**Trigger:** approved compliant payment provider, security review, legal/privacy approval, and audited tokenization design.

### Seller Central, advertising, B2B, and specialized Amazon-adjacent verticals
These are separate business surfaces with distinct roles, policies, regulations, or rights.  
**Trigger:** an approved product strategy, owner, and dedicated requirements/architecture ADR show they are needed after consumer-marketplace parity.

### Membership, subscriptions, gift cards, gift registries, sponsored placements, and advanced deal mechanics
These later-baseline features add entitlement, ledger, registry privacy/purchase-state, advertising disclosure, and recurring-order semantics that should not hide unfinished P0 work. Sponsored placements must remain clearly labelled and cannot influence the deterministic relevance explanation as an undisclosed factor.  
**Trigger:** P0 lifecycle acceptance criteria are met; the relevant entitlement/ledger, registry privacy, or sponsored-placement disclosure policy is approved; and measured demand justifies the added surface.

## Additional evidence-gated deferrals
### Multiple locales, currencies, and jurisdiction-specific tax
The initial product must first prove one explicit D-04 locale/currency policy. More locales change catalog display, pricing, tax, delivery, return disclosures, rounding, search language, support content, and test fixtures; they are not presentation-only.
**Trigger:** one-locale checkout/return fixtures are stable, a target locale has an approved owner and policy/compliance review, and migration preserves historical order snapshots.

### Push, email, and price/back-in-stock notifications
Notifications create channel consent, deduplication, preference, retry, and support expectations beyond an in-app timeline.
**Trigger:** in-app notifications and preference controls exist, research shows shoppers miss time-sensitive events through that surface, and an approved channel provider plus privacy/retention policy exists.

### Seller tooling and seller issue workflows
Consumer-visible offers can be simulated without seller onboarding, disputes, catalog editing, settlements, or seller permissions. Seller-facing tooling changes the product into a multi-sided marketplace.
**Trigger:** approved marketplace strategy, seller identity and payout/compliance ownership, dispute policy, and dedicated ADR/architecture plan after consumer baseline evidence.

## Explicitly not a v2 shortcut
The following remain prohibited until their own evidence and approval path is complete: an AI agent confirming an order or return without shopper action; AI-generated prices, inventory, eligibility, or policy; use of Qdrant or Redis as commerce authority; and microservice migration solely because the modular monolith has grown. These are architecture and trust boundaries, not deferred features.

## Promotion process
Promotion requires a new ADR, a decision-coverage row when design questions remain, an update to relevant source specifications, and an execution entry in the progress tracker. A feature request, competitor checklist, or hypothetical scale concern is insufficient evidence alone.
