# Veyra agent guide

Veyra is an AI-native consumer marketplace: it first delivers conventional Amazon-style shopping, checkout, order, return, and support journeys, then adds evidence-grounded AI discovery and guidance. The confirmed reference architecture is a TypeScript modular monolith using pnpm workspaces and strict TypeScript: Next.js web on Vercel, separate Hono TypeScript API on Vercel, Drizzle ORM with committed SQL migrations, Better Auth authentication foundation with credentials/Google OAuth/database-backed opaque sessions, Neon PostgreSQL source of truth, Upstash Redis, Qdrant Cloud, Nodemailer email adapter with Gmail SMTP only for local/prototype email, an OpenRouter-backed LLM provider adapter, and outbox workers via Vercel native scheduled/background services where suitable. This repository currently contains planning documentation only; do not invent tooling or implementation facts.

## Read first

1. Read [docs/progress-tracker.md](docs/progress-tracker.md) for current execution state.
2. Use the routing table below to select the authoritative document.
3. Read [the decision log](docs/specs/04_design_decisions_log.md) before proposing a material choice.
4. Read the relevant source spec and update the execution records when work changes reality.

## Docs

| Document | Source of truth for |
|---|---|
| [docs/PRD.md](docs/PRD.md) | Approved product requirements and release criteria |
| [docs/technical-architecture.md](docs/technical-architecture.md) | Approved reference architecture |
| [docs/amazon-baseline-inventory.md](docs/amazon-baseline-inventory.md) | Consumer-parity inventory |
| [docs/specs/00_project_overview.md](docs/specs/00_project_overview.md) | Product rationale, scope, users, glossary |
| [docs/specs/01_product_ux_flow_spec.md](docs/specs/01_product_ux_flow_spec.md) | User-visible flows and cross-cutting states |
| [docs/specs/02_system_architecture_spec.md](docs/specs/02_system_architecture_spec.md) | System boundaries, data, security, operations |
| [docs/specs/03_build_plan.md](docs/specs/03_build_plan.md) | Dependency-aware execution order and decision coverage |
| [docs/specs/04_design_decisions_log.md](docs/specs/04_design_decisions_log.md) | Material decisions and their rationale |
| [docs/specs/05_future_improvements_v2.md](docs/specs/05_future_improvements_v2.md) | Evidence-gated deferrals |
| [docs/CODING_STANDARDS.md](docs/CODING_STANDARDS.md) | Engineering and verification standards |
| [docs/progress-tracker.md](docs/progress-tracker.md) | Actual execution history and current status |

## Routing

| Question or task | Consult first |
|---|---|
| Should I build X? | [PRD non-goals/scope](docs/PRD.md#7-scope-and-priorities), then [deferrals](docs/specs/05_future_improvements_v2.md) |
| What does a shopper see or do? | [UX flows](docs/specs/01_product_ux_flow_spec.md) |
| How should it work or be integrated? | [architecture spec](docs/specs/02_system_architecture_spec.md) |
| API, data model, state or event design | [architecture spec](docs/specs/02_system_architecture_spec.md) |
| Security, privacy, auth, or trust boundary | [architecture security](docs/specs/02_system_architecture_spec.md#security-and-trust-boundaries) |
| Coding conventions or verification | [coding standards](docs/CODING_STANDARDS.md) |
| Was this decided already? | [ADR log](docs/specs/04_design_decisions_log.md) and [decision coverage](docs/specs/03_build_plan.md#master-decision-coverage-table) |
| What is deferred? | [future improvements](docs/specs/05_future_improvements_v2.md) |
| What's next? | [build plan](docs/specs/03_build_plan.md) and [progress tracker](docs/progress-tracker.md) |

## Non-negotiables

- Baseline consumer flows work without AI; AI enhances rather than replaces them ([PRD §7.1](docs/PRD.md#71-baseline-parity-gate), [ADR-001](docs/specs/04_design_decisions_log.md#adr-001-baseline-before-ai)).
- PostgreSQL is authoritative for money, availability, carts, orders, and returns; final commerce writes are transactional ([architecture §4.3](docs/technical-architecture.md#43-transactional-rules)).
- AI output is validated, grounded, optional, and cannot make price, policy, inventory, or mutation decisions ([PRD §6](docs/PRD.md#6-product-principles), [ADR-003](docs/specs/04_design_decisions_log.md#adr-003-ai-boundaries)).
- Never store real card data; payment and shipping are simulated until compliant integrations are approved ([architecture §10](docs/technical-architecture.md#10-security-and-privacy)).
- Support mutations require explicit shopper confirmation ([PRD §9.4](docs/PRD.md#94-reviews-returns-and-support)).

## When done

Update [progress](docs/progress-tracker.md) for every implementation, deviation, gap, or decision resolution. A resolved `D-##` requires four synchronized changes: the progress log, matching ADR, [build-plan coverage row](docs/specs/03_build_plan.md#master-decision-coverage-table), and the original assumption/open question. Create an ADR before a new material design judgment. Record material deviations before treating them as the new specification. Promote a deferral only after its named evidence trigger is met.

pnpm is selected as the package manager, but no package configuration, build command, test command, or runtime command is established in this repository yet.