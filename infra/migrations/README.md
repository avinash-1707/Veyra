# SQL migrations

Migrations are committed SQL files. Apply them in filename order against PostgreSQL-compatible environments.

U0 includes `0001_u0_foundation.sql` for identity sessions, product seed reads, and the transactional outbox foundation. `0002_u0_database_hardening.sql` adds U0 contract constraints, session lifecycle indexes, server-generated UUID defaults, and `updated_at` triggers.
