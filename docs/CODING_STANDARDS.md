# Coding standards

## Philosophy

Veyra makes commitments about money, inventory, delivery, orders, returns, and personal data. The standards below protect those commitments while allowing optional AI guidance. They derive from the approved architecture; pnpm is the selected package manager, but repository-specific scripts will be added only after they exist.

## Language and types

- Use TypeScript for the planned web, API, and worker code. Keep domain types and API schemas shared through the planned contracts boundary.
- Enable TypeScript strict mode for every application and shared package. Do not relax compiler options to accommodate an individual call site.
- Do not use `any`, including explicit `any`, implicit `any`, `as any`, or `any[]`. Model known values with precise types; receive untrusted or genuinely unknown values as `unknown` and narrow them with schemas or type guards before use.
- Do not use unchecked type assertions to bypass validation. An assertion is acceptable only when a preceding runtime invariant or schema validation proves the asserted shape, and the assertion cannot cross a trust boundary.
- Prefer discriminated unions for command outcomes and lifecycle states so callers must handle recoverable policy, validation, and retryable failures explicitly.
- Represent money in integer minor units or a decimal money type—never binary floating point.
- Model order and return lifecycles as explicit state transitions, not untyped strings scattered through controllers.

## Repository structure and boundaries

- Keep the modular-monolith domains in the architecture source: controllers/adapters orchestrate; domain services enforce policy; arbitrary modules do not write each other’s tables.
- Each domain exposes typed commands, queries, policies, events, and schemas through its public boundary. Other domains depend on that boundary rather than internal tables, ORM models, or implementation helpers.
- Keep transport, persistence, external-provider, and UI concerns out of domain policy. Domain logic must be testable without HTTP, React, a database connection, or a live provider.
- A cross-domain synchronous operation is coordinated through explicit domain interfaces inside its required transaction. Work that does not require the transaction is emitted as an outbox event for an idempotent consumer.
- Validate all external input at API boundaries. Treat LLM output as untrusted input and validate it against an allowlisted schema.

## Errors, logging, and security

- Return recoverable, shopper-readable errors for stock, eligibility, and AI fallback cases; never silently commit a partial commerce mutation.
- Use structured, redacted logs with request and trace IDs. Do not log credentials, payment data, raw secrets, or unnecessary personal data.
- Enforce ownership/role authorization on every account, cart, order, address, review, and return resource. Keep secrets in deployment configuration; no real card data is permitted.

## Data, integrations, and migrations

- PostgreSQL is the source of truth for commerce state. Use Drizzle ORM for typed database access and committed SQL migrations for schema changes. Use short transactional inventory reservations, idempotency keys for retriable mutations, status history, and transactional outbox events.
- Redis and Qdrant are non-authoritative. Re-fetch authoritative offer, stock, and price data before ranking or checkout.
- Each integration must define input/output, authentication, timeout/failure behavior, retry/idempotency, and owner before implementation.

## Tests and accessibility

- Unit-test policies: pricing, promotions, delivery promises, ranking, eligibility, and transitions.
- Add integration coverage for transactions, concurrent reservation, outbox delivery, and adapters; add end-to-end coverage for shopping and return loops.
- New policy branches, parsers, state transitions, money handling, authorization checks, and retry/idempotency behavior require a runnable test that fails when the behavior regresses.
- Test public behavior and contracts rather than private implementation structure. Use fixtures for catalog, policy, and provider scenarios; do not make production credentials a prerequisite for deterministic tests.
- Verify keyboard behavior, semantic controls, focus, contrast, errors, and responsive layouts for shopper flows.

## Security implementation gates

- Use a selected, parameterized password-hashing implementation (Argon2id by default) and hashed, single-use, expiring recovery/verification tokens. Authentication responses must not enumerate accounts.
- Implement the selected Better Auth session/CSRF/origin/CORS/CSP contract centrally: database-backed opaque sessions, 7-day expiry, 1-day rolling refresh, HTTP-only secure SameSite=Lax cookies, and 15-minute single-use verification/reset tokens. Handlers may not weaken it. Every privileged internal route is default-deny and separately authenticated from shopper routes.
- Apply centrally configured rate, body-size, pagination, query-complexity, and timeout limits. App-level AI spend caps are not required because budget is managed in OpenRouter; tests must still cover AI timeout/fallback behavior, spoofed client-IP headers, Redis limiter failure, credential stuffing, recovery enumeration, and cross-user authorization.
- Quarantine uploads until validation, malware scanning, and required moderation complete. Never trust declared MIME type or publicly expose an unscanned object.
- Keep user/review/catalog text out of trusted prompts. Treat it as adversarial data; preserve instruction/evidence separation and test prompt injection.

## Operations, dependencies, and verification

- Document why each dependency is required, its ownership, and its upgrade/security posture. Use a committed lockfile; commit SQL migrations; add dependency-vulnerability scanning, secret scanning, and SBOM/license review before deployment.
- Require a tested restore procedure, authorized/audited dead-letter replay, migration forward/rollback plan, and explicit RPO/RTO before production.
- Use pnpm and a committed pnpm lockfile once implementation begins. U0 must establish and document commands for formatting, linting, strict typechecking, unit/integration tests, and Drizzle SQL migration checks before feature work starts.
- Lint rules must reject explicit `any`, unsafe `any` assignments/member access/calls/returns, and unchecked promises. Compiler and lint suppressions require a narrowly scoped justification comment and must not weaken a trust boundary.
- No package scripts or commands are verified yet. Do not claim a command passed until package configuration and the command exists. CI must run the documented verification commands before a change is accepted.
