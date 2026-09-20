BEGIN;

ALTER TABLE products DROP CONSTRAINT products_currency_usd;
ALTER TABLE products ADD CONSTRAINT products_currency_inr CHECK (currency = 'INR');

COMMIT;
