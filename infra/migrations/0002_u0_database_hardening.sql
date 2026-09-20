BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE sessions ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE products ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE outbox_events ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE products
  ADD CONSTRAINT products_slug_nonblank CHECK (btrim(slug) <> ''),
  ADD CONSTRAINT products_title_nonblank CHECK (btrim(title) <> ''),
  ADD CONSTRAINT products_brand_nonblank CHECK (btrim(brand) <> ''),
  ADD CONSTRAINT products_status_published CHECK (status = 'published'),
  ADD CONSTRAINT products_currency_usd CHECK (currency = 'USD');

ALTER TABLE outbox_events
  ALTER COLUMN schema_version SET DEFAULT 1,
  ALTER COLUMN occurred_at SET DEFAULT now(),
  ALTER COLUMN state SET DEFAULT 'pending',
  ADD CONSTRAINT outbox_events_type_known CHECK (type IN ('catalog.product_published', 'offer.changed', 'order.confirmed', 'shipment.status_changed', 'order.delivered', 'return.requested', 'return.refunded', 'review.published')),
  ADD CONSTRAINT outbox_events_aggregate_type_nonblank CHECK (btrim(aggregate_type) <> ''),
  ADD CONSTRAINT outbox_events_aggregate_id_nonblank CHECK (btrim(aggregate_id) <> ''),
  ADD CONSTRAINT outbox_events_schema_version_positive CHECK (schema_version > 0),
  ADD CONSTRAINT outbox_events_correlation_id_nonblank CHECK (btrim(correlation_id) <> ''),
  ADD CONSTRAINT outbox_events_state_known CHECK (state IN ('pending', 'processing', 'processed', 'dead_letter'));

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);

CREATE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON sessions
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
