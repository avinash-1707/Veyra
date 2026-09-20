# Design Brief

This document records product-owner direction that Canvas must treat as authoritative. It gives creative work a clear purpose and boundary without prescribing a catalog of visual styles; implementation-specific token values remain a Canvas responsibility unless stated here.

## Product Intent

- **Primary product and audience:** Veyra is an AI-native consumer marketplace for shoppers, returning shoppers, and support seekers. It must first deliver conventional Amazon-style consumer journeys—discover/search, evaluate/compare, cart, simulated checkout, orders/tracking, reviews/returns/refunds, and self-service support—then add optional evidence-grounded AI guidance that reduces shopping uncertainty without replacing baseline flows.
- **Leading platform and constraints:** The leading platform is a responsive Next.js TypeScript web experience backed by a separate Hono TypeScript API. Constraints are India/INR V1 simulation, full Indian-address/PIN-aware delivery, server-authoritative commerce state, no real card storage or real shipping commitments, PostgreSQL as the source of truth, baseline paths usable without AI, and accessibility across mobile, tablet, and desktop.
- **Desired feeling:** The desired feeling is a mixture of calm evidence-led marketplace and premium intelligent concierge. This fits because Veyra needs the trust, clarity, and recoverability of conventional commerce while making optional AI feel refined and helpful rather than magical, pushy, or authoritative over prices, inventory, policy, or mutations.
- **References and exclusions:** Reference high-trust marketplaces and premium AI products for clarity, restraint, and polished guidance. Amazon is a functional-flow reference only, not a visual target. Exclude Amazon clone aesthetics, dark sci-fi AI styling, hype-heavy chatbot UI, deceptive urgency, and any presentation that makes simulated payment, delivery, seller, tax, or refund behavior look like a real-world commitment.

## Visual Direction

- **Design direction:** The visual direction is an editorial marketplace with structured commerce cards and concierge accents. Use clear shopping hierarchy, product-first cards, readable facts, and refined AI/evidence panels that feel integrated with the marketplace rather than bolted on as a chatbot demo.
- **Exploration boundary:** Fixed decisions: baseline before AI, consumer-only marketplace scope, India/INR simulation, server-authoritative commerce, explicit shopper confirmation for support/order/return mutations, grounded AI with evidence and fallback, and honest simulation disclosure. Unknowns owned by future design/Canvas exploration: exact design tokens, typography scale, component styling, card density, image treatment, iconography, and microinteraction details. Canvas may explore within those boundaries but must not change product scope, AI trust rules, accessibility requirements, deterministic commerce flows, or architecture/commerce policy decisions.
- **Must avoid:** See references and exclusions above. Do not substitute a generic "modern SaaS" style for the stated direction.

## System Contract

### Color and Themes

- **Palette, type, and material direction:** Palette, type, material, imagery, and surfaces should avoid default AI-blue. Explore warm cardboard/commerce neutrals, deep ink, accessible muted text, and restrained refined accents suitable for trust and premium concierge moments. Typography should be highly readable sans-serif with a durable hierarchy. Surfaces should use warm paper, white or lightly tinted cards, soft borders, and product/evidence-first imagery; exact tokens, font stack, and illustration/photo direction remain open for Canvas exploration.
- Use semantic roles at component call sites: background, surface, text, border, action, focus, success, warning, danger, and info.
- Keep foundation values separate from semantic roles, and semantic roles separate from component tokens.
- Verify normal text contrast at 4.5:1 or greater and non-text controls/focus indicators at 3:1 or greater.

### Type, Layout, and Surfaces

- **Information rhythm and layout priorities:** Information rhythm should use progressive disclosure and a scan-first structure. Search/category/product cards expose essentials first—title, brand/category, rating, offer/price, availability, delivery or next action—then reveal evidence, policies, comparison details, and guidance in focused sections. Mobile priorities are search, product selection, cart/checkout, orders, returns, and safe recovery states; comparison and evidence tables need mobile-readable alternatives without hiding unavailable data.
- **Surface, border, radius, and elevation language:** See palette, type, and material direction above.
- Define a spacing scale, content widths, responsive reflow rules, radius scale, border policy, and elevation policy before building components.

### States and Accessibility

- **Accessibility policy:** Accessibility and inclusion are non-negotiable: keyboard navigation, visible focus, semantic controls, contrast-compliant color use, meaningful alt text, labelled loading/empty/error/degraded/offline/permission states, associated form errors, focus management for modal/confirmation surfaces, and text—not color alone—for consequences and statuses. AI guidance must be labelled, visually separate from product facts and commitments, dismissible or bypassable through conventional routes, and safe when providers fail.
- Every interactive component needs default, hover, focus-visible, pressed, selected where applicable, disabled, loading, empty, error, and success states.
- Keyboard focus must be clearly visible. Pointer targets must be at least 24 by 24 CSS pixels unless a documented spacing exception applies.
- Do not use color as the only status signal. Support text scaling and responsive reflow without horizontal scrolling.

### Motion

- **Motion policy:** Interaction and motion should use premium concierge microinteractions while preserving commerce safety. Motion may refine guidance panels, cards, filters, loading states, confirmations, and focus transitions, but must be fast, purposeful, interruptible, and respectful of reduced-motion preferences. Never use animation to obscure price, availability, totals, policy denial, mutation confirmation, or simulation disclosure; no decorative AI shimmer that implies unsupported intelligence.
- Motion may communicate orientation, feedback, or state change only. Respect `prefers-reduced-motion` with a non-motion equivalent.
- Define duration, easing, distance, and forbidden effects before introducing animation.

## Delivery Checklist

- Build tokens in the foundation -> semantic -> component direction.
- Validate the chosen direction at mobile, tablet, and desktop widths.
- Validate light/dark, high-contrast, density, and reduced-motion variants only when the policy above requires them.
- Review the primary flow plus loading, empty, error, and success states before handoff.
