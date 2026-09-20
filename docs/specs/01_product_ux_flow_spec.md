# 01 — Product UX flow specification

**Status:** Approved planning baseline  
**Last updated:** 2026-09-20  
**Companions:** [overview](00_project_overview.md) · [design brief](../../design.md) · [architecture](02_system_architecture_spec.md)  
**Scope:** User-visible consumer behavior; implementation mechanisms belong in 02.

## How to read this doc
Each flow defines what a shopper experiences. Policies and state enforcement are specified in the architecture; product rationale is in 00.

## Flow map
`Home/category → navigation search or Guided Search → Product/compare → Cart → Checkout → Confirmation → Tracking → Review or return → Support`

## Personas & entry points
Shopper: home, category, or direct search. Returning shopper: account, history, lists, or notifications. Support seeker: help hub or authenticated order detail.

## 1. Discover, search, and evaluate
**Trigger/entry:** home, category, navigation search, or natural-language query. **States:** loading skeleton; navigation suggestions; Guided Search results with a URL-persisted query and editable interpretation; empty results with a browse recovery; product detail with media, variants, offers, facts, reviews, delivery promise; compare table for one to three products. **Permissions:** public browsing; personalization is controllable. **Success:** shopper selects a valid offer/variant and adds it to cart. **Edges:** unavailable offer, invalid intent interpretation, missing comparison fields, address absent, image/load failure. Guided Search interpretation and reasons are labelled guidance, editable, and evidence-backed.

## 2. Cart and simulated checkout
**Trigger/entry:** add-to-cart or Buy Now. **States:** persistent cart, quantity/variant edits, unavailable-item recovery, address selection, mock payment selection, delivery choice, coupon/promotion state where enabled, review, confirmation. **Permissions:** checkout requires an authenticated shopper, address, and payment token. **Success:** a confirmed order with accurate server-calculated totals and a receipt. **Edges:** reservation conflict, expired checkout, payment simulation failure, invalid address, duplicate submit; show a clear recoverable result and never duplicate an order.

## 3. Orders, tracking, cancellation, and buy again
**Trigger/entry:** confirmation, account order history, or notification. **States:** order detail, item-level shipment timeline, cancellation eligibility, exception/return-to-sender states, buy-again availability revalidation. **Success:** shopper understands current state or completes a permitted cancellation. **Edges:** unauthorised order, ineligible cancellation, stale status, unavailable reorder.

## 4. Delivered-item review and return
**Trigger/entry:** delivered order item. **States:** verified-review eligibility; review editor/submission/moderation state; return eligibility; reason, method, replacement/refund choice; request and refund timeline. **Permissions:** only eligible delivered purchaser can create verified review or return. **Success:** review is submitted or return request reaches a visible outcome. **Edges:** policy denial with reason, duplicate review, prior return, expired window, rejected/cancelled request.

## 5. Support self-service
**Trigger/entry:** help hub or order context. **States:** authenticated context, supported intent, policy/eligibility result, proposed action, explicit confirmation, updated timeline. **Success:** supported tracking/cancel/return/refund action resolves through existing deterministic endpoint. **Edges:** no matching order, unsupported intent, provider failure, permission denial; provide conventional self-service routes.

## Screen or interface inventory
Persistent header/location/account/cart; home/category; Guided Search; detail; compare; cart; checkout; confirmation; account/orders; tracking; return/review; help/support.

## Cross-cutting states
All flows require designed loading, empty, error, offline/degraded, permission, and notification states; keyboard access, focus, semantic controls, contrast, and responsive layouts are mandatory. Use [design.md](../../design.md) for the durable visual, interaction, motion, and Canvas exploration boundaries. Mock delivery/payment must never be represented as a real commitment.

## Route and state conventions
Routes are illustrative URL contracts for the web experience; exact framework routing remains an implementation concern. Search state is shareable and URL-persisted. Account-owned routes must not expose resource existence to a non-owner. Every command has a pending state that prevents accidental duplicate submission while preserving an accessible retry path after a recoverable failure.

| Surface | Illustrative route | Primary state source |
|---|---|---|
| Home/category | `/`, `/c/:category` | catalog and discovery query |
| Guided Search | `/intelligent-search?q=` | URL query plus catalog-backed guided results |
| Product | `/p/:slug` | canonical product and selected offer/variant |
| Compare | `/compare?products=` | URL-selected product identifiers |
| Cart | `/cart` | shopper or guest cart |
| Checkout | `/checkout` | server quote and authenticated account state |
| Orders | `/orders`, `/orders/:id` | owned order snapshot and current timeline |
| Return | `/orders/:id/returns/:returnId` | owned return request |
| Help | `/help`, `/orders/:id/help` | authenticated context and deterministic support tools |

## Interaction contracts
### Discovery and evaluation
- Navigation search preserves the shopper's typed query, shows debounced catalog suggestions, and opens Guided Search with the chosen or submitted query.
- Guided Search exposes an editable interpretation and its recognized constraints before results are used for product evaluation.
- Results distinguish product facts from the currently selected or lowest qualifying offer. Price, stock, and delivery messages identify their offer and address context.
- A compare table uses a stable normalized field order. Missing information is rendered as unavailable, not inferred from a similar variant or product.

### Cart and checkout
- Cart edits are confirmed against the server before checkout totals become authoritative. A stale cart identifies the affected item and offers a repair action.
- Review shows items, quantity, offer/variant, destination and option, subtotal, discount, shipping, tax, final total, and simulation disclosure.
- Confirm order is a deliberate terminal action. It submits one idempotent command and ends in exactly one of confirmed order, recoverable validation/policy failure, or retryable service failure.
- A quote can expire. The shopper sees what changed and explicitly accepts a refreshed quote before another confirmation attempt.
- Mock payment failure never looks like a real bank decline. It explains that no card was charged and preserves a safe retry path.

### Orders, review, and return
- Order detail remains readable from the immutable snapshot even if an offer is withdrawn or a product changes later.
- Cancellation availability is calculated server-side when requested. An ineligible result names the policy reason and leaves tracking accessible.
- Buy again revalidates current offer, price, and availability before changing a cart; it never silently recreates historical terms.
- Review eligibility and verified status are derived by the server. A review editor shows submission and moderation outcome clearly.
- Return begins with item-level eligibility and shows deadline, supported outcomes, and reason choices before request submission. Replacement appears only when policy and current availability permit it.

### Support confirmation
- Guidance reads account context only after authentication and ownership checks.
- Before a mutation, the proposal names affected order/return, expected outcome, policy constraints, and a separate confirm control.
- Confirmation invokes the same deterministic command as the conventional surface; it is never a model-side action.
- When AI guidance is unavailable, help retains direct tracking, cancellation, and return routes.

## State catalog
| State | Required behavior |
|---|---|
| Loading | Preserve structure with a labelled skeleton or progress indicator; do not show fabricated price, availability, or timeline data. |
| Empty | Explain current scope, preserve search/filter controls, and offer a relevant next action. |
| Validation | Associate the error with its control, preserve entered safe values, and do not imply a mutation occurred. |
| Permission | Avoid disclosing another shopper's resource. Prompt sign-in only where it can unlock the action. |
| Degraded | Keep conventional discovery and self-service available when AI, semantic retrieval, or non-authoritative services fail. |
| Retryable failure | Retain safe context, provide retry, and use idempotency semantics rather than asking whether a command completed. |
| Offline | Do not present order, return, or payment confirmation as complete offline actions. |

## Accessibility and responsive acceptance
- Core search-to-order and delivered-item return/review paths are keyboard-usable at mobile, tablet, and desktop widths.
- Modal or confirmation surfaces manage focus, restore it on dismissal, and expose consequences in text rather than colour alone.
- Dynamic totals, availability, and status changes are announced without a disruptive stream of announcements.
- Product media has meaningful alt text or is explicitly decorative; comparison tables retain headers and a mobile-readable equivalent.
