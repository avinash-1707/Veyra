---
id: veyra-neon-commerce-persistence
type: state
tags: veyra, neon, database, persistence
updated_at: 2026-09-20T13:43:05.195Z
---
Veyra now has committed Neon/PostgreSQL commerce persistence migrations through infra/migrations/0005_seed_local_catalog.sql. Runtime DB selection is in apps/api/src/platform/database.ts: production prefers DATABASE_URL_POOLED, migrations use DATABASE_URL. Cart, checkout/order, returns/reviews/support APIs persist to PostgreSQL when DB env exists and fall back to memory for no-DB tests. Discovery/evaluation read repository cutover remains a known follow-up.
