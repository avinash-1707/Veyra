BEGIN;

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (btrim(slug) <> ''),
  name text NOT NULL CHECK (btrim(name) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_alt text,
  ADD COLUMN IF NOT EXISTS rating numeric(3,2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  ADD COLUMN IF NOT EXISTS specifications jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (btrim(name) <> ''),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_variants_product_id_idx ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (btrim(name) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id uuid NOT NULL REFERENCES product_variants(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES sellers(id),
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  amount_minor integer NOT NULL CHECK (amount_minor >= 0),
  condition text NOT NULL CHECK (condition IN ('new', 'open_box')),
  availability text NOT NULL CHECK (availability IN ('available', 'unavailable', 'withdrawn')),
  expedited_eligible boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS offers_product_id_idx ON offers(product_id);
CREATE INDEX IF NOT EXISTS offers_variant_id_idx ON offers(variant_id);

CREATE TABLE IF NOT EXISTS inventory_stock (
  offer_id uuid PRIMARY KEY REFERENCES offers(id) ON DELETE CASCADE,
  available_quantity integer NOT NULL CHECK (available_quantity >= 0),
  reserved_quantity integer NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (available_quantity >= reserved_quantity)
);

CREATE TABLE IF NOT EXISTS carts (
  id text PRIMARY KEY CHECK (btrim(id) <> ''),
  shopper_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id text NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES offers(id),
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 10),
  location text NOT NULL CHECK (location IN ('cart', 'saved_for_later')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, offer_id, variant_id, location)
);

CREATE INDEX IF NOT EXISTS cart_items_cart_id_idx ON cart_items(cart_id);

CREATE TABLE IF NOT EXISTS idempotency_records (
  scope text NOT NULL CHECK (btrim(scope) <> ''),
  actor_id text NOT NULL CHECK (btrim(actor_id) <> ''),
  idempotency_key text NOT NULL CHECK (btrim(idempotency_key) <> ''),
  request_fingerprint text NOT NULL CHECK (btrim(request_fingerprint) <> ''),
  status text NOT NULL CHECK (status IN ('ok', 'conflict', 'not_found', 'policy_conflict', 'validation')),
  response jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope, actor_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS checkout_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id text NOT NULL CHECK (btrim(shopper_id) <> ''),
  cart_id text NOT NULL REFERENCES carts(id),
  expires_at timestamptz NOT NULL,
  shipping_address jsonb NOT NULL,
  delivery_speed text NOT NULL CHECK (delivery_speed IN ('standard', 'expedited')),
  mock_payment_method text NOT NULL CHECK (mock_payment_method IN ('mock_success', 'mock_failure')),
  lines jsonb NOT NULL,
  totals jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkout_quotes_shopper_id_idx ON checkout_quotes(shopper_id);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id text NOT NULL CHECK (btrim(shopper_id) <> ''),
  quote_id uuid NOT NULL UNIQUE REFERENCES checkout_quotes(id),
  status text NOT NULL CHECK (status IN ('confirmed', 'preparing', 'shipped', 'delivered', 'cancelled')),
  payment_status text NOT NULL CHECK (payment_status IN ('authorized', 'failed', 'voided')),
  shipping_address jsonb NOT NULL,
  delivery_speed text NOT NULL CHECK (delivery_speed IN ('standard', 'expedited')),
  items jsonb NOT NULL,
  totals jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_shopper_created_at_idx ON orders(shopper_id, created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  cart_line_id text NOT NULL,
  product_id uuid NOT NULL REFERENCES products(id),
  variant_id uuid NOT NULL REFERENCES product_variants(id),
  offer_id uuid NOT NULL REFERENCES offers(id),
  item_snapshot jsonb NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, cart_line_id)
);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  mock_payment_method text NOT NULL CHECK (mock_payment_method IN ('mock_success', 'mock_failure')),
  status text NOT NULL CHECK (status IN ('authorized', 'failed', 'voided')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (btrim(status) <> ''),
  message text NOT NULL CHECK (btrim(message) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_history_order_id_created_at_idx ON order_history(order_id, created_at);

CREATE TABLE IF NOT EXISTS stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  offer_id uuid NOT NULL REFERENCES offers(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  state text NOT NULL CHECK (state IN ('reserved', 'released', 'consumed')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('preparing', 'shipped', 'delivered', 'cancelled')),
  delivery_speed text NOT NULL CHECK (delivery_speed IN ('standard', 'expedited')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (btrim(status) <> ''),
  message text NOT NULL CHECK (btrim(message) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shopper_id text NOT NULL CHECK (btrim(shopper_id) <> ''),
  line_id text NOT NULL CHECK (btrim(line_id) <> ''),
  item_snapshot jsonb NOT NULL,
  reason text NOT NULL CHECK (reason IN ('damaged', 'wrong_item', 'not_as_described', 'changed_mind')),
  state text NOT NULL CHECK (state IN ('requested', 'received', 'approved', 'refunded', 'rejected', 'cancelled')),
  refund_status text NOT NULL CHECK (refund_status IN ('not_started', 'pending', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS return_requests_shopper_order_idx ON return_requests(shopper_id, order_id);
CREATE UNIQUE INDEX IF NOT EXISTS return_requests_active_line_idx ON return_requests(order_id, line_id) WHERE state NOT IN ('rejected', 'cancelled');

CREATE TABLE IF NOT EXISTS return_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (btrim(status) <> ''),
  message text NOT NULL CHECK (btrim(message) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id uuid NOT NULL UNIQUE REFERENCES return_requests(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('pending', 'refunded')),
  amount jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  line_id text,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shopper_id text,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text NOT NULL CHECK (btrim(title) <> ''),
  body text NOT NULL CHECK (btrim(body) <> ''),
  author_display_name text NOT NULL DEFAULT 'Verified shopper',
  verified_purchase boolean NOT NULL DEFAULT false,
  moderation_status text NOT NULL CHECK (moderation_status IN ('published', 'pending', 'rejected', 'reported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS reviews_verified_order_line_idx ON reviews(order_id, line_id) WHERE verified_purchase;
CREATE INDEX IF NOT EXISTS reviews_product_created_at_idx ON reviews(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS review_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  shopper_id text NOT NULL CHECK (btrim(shopper_id) <> ''),
  vote text NOT NULL CHECK (vote IN ('helpful', 'not_helpful')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (review_id, shopper_id)
);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  shopper_id text,
  question text NOT NULL CHECK (btrim(question) <> ''),
  answer text,
  moderation_status text NOT NULL DEFAULT 'published' CHECK (moderation_status IN ('published', 'pending', 'rejected', 'reported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS questions_product_created_at_idx ON questions(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id text NOT NULL CHECK (btrim(shopper_id) <> ''),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('track', 'cancel', 'return', 'refund')),
  summary text NOT NULL CHECK (btrim(summary) <> ''),
  constraints_text text NOT NULL CHECK (btrim(constraints_text) <> ''),
  command jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL CHECK (btrim(actor_id) <> ''),
  aggregate_type text NOT NULL CHECK (btrim(aggregate_type) <> ''),
  aggregate_id text NOT NULL CHECK (btrim(aggregate_id) <> ''),
  status text NOT NULL CHECK (btrim(status) <> ''),
  message text NOT NULL CHECK (btrim(message) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_events_aggregate_idx ON audit_events(aggregate_type, aggregate_id, created_at);

CREATE TRIGGER categories_set_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER product_variants_set_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER sellers_set_updated_at BEFORE UPDATE ON sellers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER offers_set_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER carts_set_updated_at BEFORE UPDATE ON carts FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER cart_items_set_updated_at BEFORE UPDATE ON cart_items FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER shipments_set_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER return_requests_set_updated_at BEFORE UPDATE ON return_requests FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER refunds_set_updated_at BEFORE UPDATE ON refunds FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER reviews_set_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER questions_set_updated_at BEFORE UPDATE ON questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;
