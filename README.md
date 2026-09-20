# Veyra

Veyra is a planned AI-native consumer marketplace. It targets a complete conventional shopping lifecycle—discovery, search, product evaluation, cart, simulated checkout, orders, tracking, returns, and support—before adding transparent, evidence-grounded AI assistance.

## Quick start

Install dependencies with pnpm:

```bash
pnpm install
```

## Commands

```bash
pnpm typecheck         # strict TypeScript project references
pnpm lint              # repository lint gate rejecting explicit any
pnpm test              # Vitest unit/contract tests
pnpm migrations:check  # committed SQL migration sanity check
pnpm verify            # typecheck, lint, migration check, then tests
```

## Repository layout

```text
AGENTS.md                      AI operating manual
apps/api/                      Hono API foundation
apps/worker/                   Scheduled/background worker foundation
packages/contracts/            Shared API and event contracts
packages/config/               Environment and service policy config
packages/db/                   Drizzle schema
infra/migrations/              Committed SQL migrations
docs/PRD.md                    Product requirements
docs/technical-architecture.md Reference architecture
docs/amazon-baseline-inventory.md Consumer parity inventory
docs/specs/                    Coordinated product, UX, architecture, plan, ADR, and deferral specs
docs/CODING_STANDARDS.md       Engineering standards
docs/progress-tracker.md       Execution record
```

## Working on this

Read [AGENTS.md](AGENTS.md) first. It routes work to the authoritative documentation, records non-negotiables, and defines the decision/progress update protocol.

## Documentation index

- [Project overview](docs/specs/00_project_overview.md)
- [Product UX flows](docs/specs/01_product_ux_flow_spec.md)
- [System architecture](docs/specs/02_system_architecture_spec.md)
- [Build plan](docs/specs/03_build_plan.md)
- [Design decisions](docs/specs/04_design_decisions_log.md)
- [Future improvements](docs/specs/05_future_improvements_v2.md)
- [Coding standards](docs/CODING_STANDARDS.md)
- [Progress tracker](docs/progress-tracker.md)
