# Coding standards

## Philosophy

Veyra makes commitments about money, inventory, delivery, orders, returns, and personal data. The standards below protect those commitments while allowing optional AI guidance. They derive from the approved architecture; repository-specific tooling will be added only after it exists.

## Language and types

- Use TypeScript for the planned web, API, and worker code. Keep domain types and API schemas shared through the planned contracts boundary.
- Represent money in integer minor units or a decimal money type—never binary floating point.
- Model order and return lifecycles as explicit state transitions, not untyped strings scattered through controllers.

## Repository structure and boundaries

- Keep the modular-monolith domains in the architecture source: controllers/adapters orchestrate; domain services enforce policy; arbitrary modules do not write each other’s tables.
- Validate all external input at API boundaries. Treat LLM output as untrusted input and validate it against an allowlisted schema.

## Errors, logging, and security

- Return recoverable, shopper-readable errors for stock, eligibility, and AI fallback cases; never silently commit a partial commerce mutation.
- Use structured, redacted logs with request and trace IDs. Do not log credentials, payment data, raw secrets, or unnecessary personal data.
- Enforce ownership/role authorization on every account, cart, order, address, review, and return resource. Keep secrets in deployment configuration; no real card data is permitted.

## Data, integrations, and migrations

- PostgreSQL is the source of truth for commerce state. Use short transactional inventory reservations, idempotency keys for retriable mutations, status history, and transactional outbox events.
- Redis and Qdrant are non-authoritative. Re-fetch authoritative offer, stock, and price data before ranking or checkout.
- Each integration must define input/output, authentication, timeout/failure behavior, retry/idempotency, and owner before implementation.

## Tests and accessibility

- Unit-test policies: pricing, promotions, delivery promises, ranking, eligibility, and transitions.
- Add integration coverage for transactions, concurrent reservation, outbox delivery, and adapters; add end-to-end coverage for shopping and return loops.
- Verify keyboard behavior, semantic controls, focus, contrast, errors, and responsive layouts for shopper flows.

## Security implementation gates

- Use a selected, parameterized password-hashing implementation (Argon2id by default) and hashed, single-use, expiring recovery/verification tokens. Authentication responses must not enumerate accounts.
- Implement the selected session/CSRF/CORS/CSP contract centrally; handlers may not weaken it. Every privileged internal route is default-deny and separately authenticated from shopper routes.
- Apply centrally configured rate, body-size, pagination, query-complexity, timeout, and AI-cost limits. Tests must cover spoofed client-IP headers, Redis limiter failure, credential stuffing, recovery enumeration, and cross-user authorization.
- Quarantine uploads until validation, malware scanning, and required moderation complete. Never trust declared MIME type or publicly expose an unscanned object.
- Keep user/review/catalog text out of trusted prompts. Treat it as adversarial data; preserve instruction/evidence separation and test prompt injection.

## Operations, dependencies, and verification

- Document why each dependency is required, its ownership, and its upgrade/security posture. Use a committed lockfile; add dependency-vulnerability scanning, secret scanning, and SBOM/license review before deployment.
- Require a tested restore procedure, authorized/audited dead-letter replay, migration forward/rollback plan, and explicit RPO/RTO before production.
- No package scripts or commands are verified yet. Do not claim a command passed until package configuration and the command exist.
