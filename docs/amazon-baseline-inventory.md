# Amazon.com Consumer Baseline Inventory for Veyra

**Purpose:** Define the Amazon.com consumer-retail functionality Veyra should recreate before adding Veyra-only AI improvements.  
**Scope:** Amazon.com customer-facing shopping flows. Feature availability can differ by account, location, category, and fulfillment method; this is a functional inventory, not a claim that every Amazon feature is globally available.

## How to use this inventory

- **Baseline** means Veyra needs a conventional, usable equivalent.
- **Later baseline** means it remains part of consumer parity but follows the core shopping lifecycle.
- **Reference only** means it is visible around Amazon.com but belongs to a separate product/business surface and is not part of the initial Veyra consumer marketplace.
- AI enhancements are documented separately. They improve a baseline flow; they never substitute for one.

## 1. Global store, discovery, and navigation

| Amazon.com capability | Veyra baseline equivalent | Priority |
|---|---|---|
| Global navigation, account entry, cart, delivery-location selection | Persistent header with account, cart, category menu, and address-aware delivery location | Baseline |
| Homepage merchandising | Featured categories, deals, trending products, recently viewed, and personalized modules | Baseline |
| Category/subcategory browsing | Category landing pages, facets, breadcrumbs, and browse grids | Baseline |
| Search bar, autocomplete, suggestions, related searches | Keyword search, suggestions, recent/related searches, and category scoping | Baseline |
| Search-result facets and sorting | Category, brand, price, rating, availability, delivery, condition, and sort options | Baseline |
| Sponsored/promoted product placements | Clearly labelled promoted-result slot backed by seeded data; no seller-ad console initially | Later baseline |
| Deals, coupons, and time-limited offers | Deals hub, coupon clipping/application, countdown presentation, and price badges | Later baseline |
| Location/locale dependent catalog and delivery | Address-aware catalog availability and delivery promise in one supported locale/currency at first | Baseline |

## 2. Product discovery and evaluation

| Amazon.com capability | Veyra baseline equivalent | Priority |
|---|---|---|
| Product detail pages | Canonical product detail: title, media, brand, category, specifications, description, price, availability | Baseline |
| Variations | Explicit variant selection for attributes such as size, color, capacity, or configuration | Baseline |
| Multiple offers / buying options | Consumer-visible offers with seller identity, condition, price, stock, and delivery terms | Baseline |
| Delivery promise and stock status | Address-, offer-, and warehouse-aware simulated delivery date/window and availability | Baseline |
| Product ratings and customer reviews | Ratings distribution, review list, sort/filter, media, verified-purchase indicator, helpful votes | Baseline |
| Customer questions and answers | Question submission, answer list, helpful votes, and distinct labels for customer/brand answers | Baseline |
| Product comparison | Side-by-side comparison of up to three products with normalized attributes | Baseline |
| Related items, similar items, frequently bought together | Rule- or event-backed recommendation modules with clear labels | Baseline |
| Product videos, rich media, brand/editorial content | Media gallery and optional curated detail sections | Later baseline |
| Product availability alerts / price history | Back-in-stock and price-watch alerts; price history when price-event data exists | Later baseline |

## 3. Account and identity

| Amazon.com capability | Veyra baseline equivalent | Priority |
|---|---|---|
| Account creation, sign-in, sign-out | Email/password authentication, verified session, account recovery flow | Baseline |
| Login/security management | Change credentials, session/device list where supported, notification preferences | Baseline |
| Profile and preferences | Profile, personalization preferences, communication preferences, and privacy controls | Baseline |
| Address book and defaults | Create/edit/delete/default delivery addresses and address-level delivery preferences | Baseline |
| Payment-method wallet | Tokenized mock card/wallet methods; create/edit/remove/default method | Baseline |
| Browsing history and recommendation controls | Recently viewed, clear/remove actions, opt-out of personalized modules | Baseline |
| Gift-card balance and transaction history | Simulated gift-card code redemption, balance application, and ledger | Later baseline |
| Content/device/account settings | Excluded initially; these belong to separate digital-content/device product surfaces | Reference only |

## 4. Cart, checkout, and purchase

| Amazon.com capability | Veyra baseline equivalent | Priority |
|---|---|---|
| Shopping cart and save-for-later | Persistent cart, quantity edits, removal, and save-for-later | Baseline |
| Buy Now | Product-to-checkout flow with preselected offer and variant | Baseline |
| Checkout address/payment/delivery selection | Address, mock payment method, delivery option, order review, and confirmation | Baseline |
| Price breakdown | Subtotal, configured/applied promotion or coupon discount where enabled, delivery, tax, gift-card balance where enabled, and final total | Baseline |
| Promo/coupon application | Shopper-facing eligibility validation, explicit applied discount, conflict resolution, and coupon claim/apply flows | Later baseline |
| Gift cards | Purchase/redeem simulation and checkout balance use | Later baseline |
| Prime-style eligibility | Membership entitlement changes delivery/deal presentation; benefits are simulated | Later baseline |
| Subscribe & Save | Eligible recurring product, interval choice, subscription management, skip/cancel | Later baseline |
| Real cards, stored payment credentials, external wallet/payment rails | Never handled directly by Veyra; use mock provider contracts until a compliant provider is authorized | Reference only |

## 5. Orders, fulfillment, and post-purchase support

| Amazon.com capability | Veyra baseline equivalent | Priority |
|---|---|---|
| Order history and order detail | Searchable order history, immutable item/price snapshot, invoice-like record | Baseline |
| Shipment tracking | Item-level shipment status, tracking timeline, promised delivery window, delivery exception state | Baseline |
| Open-order edits/cancellation | Policy-gated cancellation and address/delivery changes before configured cutoff | Baseline |
| Buy again / reorder | Order-history entry and quick add-to-cart after availability/price revalidation | Baseline |
| Returns and replacements | Eligibility, item/reason/method selection, request state, replacement/refund outcome | Baseline |
| Return label / box-free drop-off equivalents | Simulated label/QR code and return-method instructions | Later baseline |
| Refund tracking | Refund initiation and completed/refused state visible from order and return detail | Baseline |
| Invoice access | Generated order invoice/receipt view and downloadable record | Later baseline |
| Customer-service help | Help hub plus order-specific self-service: track, cancel, return, replace, refund, and contact-support entry | Baseline |
| Seller-specific issue path | Offer-related issue context and support routing; no Seller Central UI | Later baseline |

## 6. Lists, gifts, and recurring engagement

| Amazon.com capability | Veyra baseline equivalent | Priority |
|---|---|---|
| Wish lists and custom lists | Create, rename, add/remove items, move to cart, privacy choice | Later baseline |
| Shared lists | Read-only share link and invited-collaborator additions | Later baseline |
| Gift registries | Simplified birthday/wedding registry with purchased-item state | Later baseline |
| Gift ordering | Gift recipient/message options and gift return simulation | Later baseline |
| Notifications | In-app order, shipment, delivery, return/refund, price-drop, and back-in-stock notices | Later baseline |
| Membership | Membership status, delivery/deal eligibility, benefits page, management state | Later baseline |

## 7. Community, trust, and support safeguards

| Amazon.com capability | Veyra baseline equivalent | Priority |
|---|---|---|
| Community-content eligibility | Only eligible delivered-order items receive verified-purchase status; platform policy can restrict contributions | Baseline |
| Review moderation and reporting | Draft/published/flagged moderation status, report action, and visible policy boundary | Baseline |
| Seller versus product feedback separation | Product review vs. order/support issue are separate data and UI paths | Baseline |
| Account/order risk controls | Basic rate limits, idempotency, audit history, and rules-based risk flags | Baseline |
| Accessibility and privacy controls | Keyboard-accessible UI, behavior-history controls, minimum data collection, account/privacy settings | Baseline |

## 8. Amazon experiences intentionally outside Veyra's initial consumer-retail scope

These are real Amazon-adjacent offerings, but they should not delay consumer Amazon.com parity:

- Seller Central, FBA operations, seller onboarding, seller advertising controls, and payouts.
- Amazon Business procurement, organizational accounts, purchase approvals, and B2B pricing.
- Amazon Web Services, Alexa home-control features, and device management.
- Prime Video, Kindle, Audible, Music, Pharmacy, Fresh/Whole Foods, and other specialized verticals with their own catalogs, regulations, or rights systems.
- Real payment acquiring, credit products, tax compliance across jurisdictions, and carrier integrations.

## 9. Veyra improvements mapped to the baseline

| Baseline experience | Veyra improvement | Rule |
|---|---|---|
| Keyword search and filters | Natural-language intent extraction and hybrid retrieval | Shopper can inspect/edit the interpretation; manual search still works. |
| Product-result ordering | Transparent rank factors and “Why this?” | Explanations come from actual attributes, price, rating, and delivery factors. |
| Comparison table | Grounded trade-off synthesis | AI summarizes supplied product facts; it must expose uncertainty. |
| Raw review browsing | Review-theme/sentiment synthesis | Summaries retain counts and link back to supporting reviews. |
| Conventional recommendations | Event-based personalized discovery | User can understand, clear, or opt out of personalization. |
| Help hub and order self-service | Grounded support assistant | Assistant proposes existing actions; user confirms every mutation. |

## 10. Source notes

The inventory is shaped by the current Amazon customer-help material and the existing product research in the Veyra planning conversation. Useful primary references include:

- [Amazon customer support and order self-service](https://digprjsurvey.amazon.com/csad/help/node/GSD587LKW72HKU2V)
- [Amazon order returns and replacements](https://digprjsurvey.amazon.com/csad/help/node/G6E3B2E8QPHQ88KF)
- [Amazon address management](https://digprjsurvey.amazon.com/csad/help/node/GQT5HV6YYGNDSFNW)
- [Amazon payment-method management](https://digprjsurvey.amazon.com/csad/help/node/GNQFBWDZJN838JZF)
- [Amazon lists](https://digprjsurvey.amazon.com/csad/help/node/GHCGC7B7SQ222YMD)
- [Amazon community and review rules](https://digprjsurvey.amazon.com/csad/help/node/GLHXEX85MENUE4XF)
- [Alexa for Shopping](https://digprjsurvey.amazon.com/csad/help/node/Tvh55TTsQ5XQSFc7Pr)
