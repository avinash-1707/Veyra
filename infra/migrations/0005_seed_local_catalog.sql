BEGIN;

INSERT INTO categories (id, slug, name) VALUES
  ('018f3f7d-0000-7000-9000-000000000001', 'bags', 'Bags'),
  ('018f3f7d-0000-7000-9000-000000000002', 'audio', 'Audio'),
  ('018f3f7d-0000-7000-9000-000000000003', 'home-office', 'Home office')
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO sellers (id, name) VALUES
  ('018f3f7d-0000-7000-9000-000000000101', 'Veyra Retail'),
  ('018f3f7d-0000-7000-9000-000000000102', 'Audio Outlet'),
  ('018f3f7d-0000-7000-9000-000000000103', 'Veyra Home')
ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

INSERT INTO products (id, slug, title, brand, status, currency, amount_minor, available_quantity, category_id, description, image_url, image_alt, rating, review_count, specifications) VALUES
  ('018f3f7d-486c-7d73-9e13-83d8d0c75611', 'veyra-everyday-backpack', 'Veyra Everyday Backpack', 'Veyra Basics', 'published', 'INR', 459900, 6, '018f3f7d-0000-7000-9000-000000000001', 'A structured daypack with a padded laptop sleeve and weather-resistant outer fabric.', '/catalog/everyday-backpack.webp', 'Charcoal Veyra Everyday Backpack', 4.4, 218, '{"Capacity":"22 L","Laptop sleeve":"Fits up to 15 inch","Material":"Recycled polyester"}'::jsonb),
  ('018f3f7d-5b68-7aef-9e10-2d890fc8a612', 'veyra-noise-isolating-earbuds', 'Veyra Noise-Isolating Earbuds', 'Veyra Audio', 'published', 'INR', 799900, 5, '018f3f7d-0000-7000-9000-000000000002', 'Wireless earbuds with passive noise isolation and a compact charging case.', '/catalog/earbuds.webp', 'Veyra Noise-Isolating Earbuds in their charging case', 4.2, 143, '{"Battery":"24 hours with case","Connectivity":"Bluetooth 5.3","Water resistance":"IPX4"}'::jsonb),
  ('018f3f7d-6c72-7d73-9e13-83d8d0c75616', 'veyra-ergonomic-desk-chair', 'Veyra Ergonomic Desk Chair', 'Veyra Home', 'published', 'INR', 1299900, 0, '018f3f7d-0000-7000-9000-000000000003', 'An adjustable desk chair with lumbar support and breathable mesh back.', '/catalog/desk-chair.webp', 'Veyra Ergonomic Desk Chair in graphite', 4.6, 89, '{"Material":"Mesh and fabric","Seat height":"44–54 cm","Warranty":"2 years"}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, brand = EXCLUDED.brand, amount_minor = EXCLUDED.amount_minor, available_quantity = EXCLUDED.available_quantity, category_id = EXCLUDED.category_id, description = EXCLUDED.description, image_url = EXCLUDED.image_url, image_alt = EXCLUDED.image_alt, rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, specifications = EXCLUDED.specifications;

INSERT INTO product_variants (id, product_id, name, attributes) VALUES
  ('018f3f7d-486c-7d73-9e13-83d8d0c75612', '018f3f7d-486c-7d73-9e13-83d8d0c75611', 'Charcoal', '{"Color":"Charcoal"}'::jsonb),
  ('018f3f7d-486c-7d73-9e13-83d8d0c75613', '018f3f7d-486c-7d73-9e13-83d8d0c75611', 'Sand', '{"Color":"Sand"}'::jsonb),
  ('018f3f7d-5b68-7aef-9e10-2d890fc8a613', '018f3f7d-5b68-7aef-9e10-2d890fc8a612', 'Midnight', '{"Color":"Midnight"}'::jsonb),
  ('018f3f7d-6c72-7d73-9e13-83d8d0c75617', '018f3f7d-6c72-7d73-9e13-83d8d0c75616', 'Graphite', '{"Color":"Graphite"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, attributes = EXCLUDED.attributes;

INSERT INTO offers (id, product_id, variant_id, seller_id, currency, amount_minor, condition, availability, expedited_eligible) VALUES
  ('018f3f7d-486c-7d73-9e13-83d8d0c75614', '018f3f7d-486c-7d73-9e13-83d8d0c75611', '018f3f7d-486c-7d73-9e13-83d8d0c75612', '018f3f7d-0000-7000-9000-000000000101', 'INR', 459900, 'new', 'available', true),
  ('018f3f7d-486c-7d73-9e13-83d8d0c75615', '018f3f7d-486c-7d73-9e13-83d8d0c75611', '018f3f7d-486c-7d73-9e13-83d8d0c75613', '018f3f7d-0000-7000-9000-000000000101', 'INR', 459900, 'new', 'available', true),
  ('018f3f7d-5b68-7aef-9e10-2d890fc8a614', '018f3f7d-5b68-7aef-9e10-2d890fc8a612', '018f3f7d-5b68-7aef-9e10-2d890fc8a613', '018f3f7d-0000-7000-9000-000000000101', 'INR', 799900, 'new', 'available', false),
  ('018f3f7d-5b68-7aef-9e10-2d890fc8a615', '018f3f7d-5b68-7aef-9e10-2d890fc8a612', '018f3f7d-5b68-7aef-9e10-2d890fc8a613', '018f3f7d-0000-7000-9000-000000000102', 'INR', 749900, 'open_box', 'withdrawn', false),
  ('018f3f7d-6c72-7d73-9e13-83d8d0c75618', '018f3f7d-6c72-7d73-9e13-83d8d0c75616', '018f3f7d-6c72-7d73-9e13-83d8d0c75617', '018f3f7d-0000-7000-9000-000000000103', 'INR', 1299900, 'new', 'unavailable', false)
ON CONFLICT (id) DO UPDATE SET amount_minor = EXCLUDED.amount_minor, availability = EXCLUDED.availability, expedited_eligible = EXCLUDED.expedited_eligible;

INSERT INTO inventory_stock (offer_id, available_quantity) VALUES
  ('018f3f7d-486c-7d73-9e13-83d8d0c75614', 1),
  ('018f3f7d-486c-7d73-9e13-83d8d0c75615', 5),
  ('018f3f7d-5b68-7aef-9e10-2d890fc8a614', 5),
  ('018f3f7d-5b68-7aef-9e10-2d890fc8a615', 0),
  ('018f3f7d-6c72-7d73-9e13-83d8d0c75618', 0)
ON CONFLICT (offer_id) DO UPDATE SET available_quantity = EXCLUDED.available_quantity;

INSERT INTO reviews (id, product_id, rating, title, body, author_display_name, verified_purchase, moderation_status, created_at) VALUES
  ('018f3f7d-486c-7d73-9e13-83d8d0c75651', '018f3f7d-486c-7d73-9e13-83d8d0c75611', 5, 'Reliable work bag', 'The laptop sleeve is snug and the fabric has handled daily commute rain.', 'Nisha', true, 'published', '2026-09-01T09:00:00.000Z'),
  ('018f3f7d-5b68-7aef-9e10-2d890fc8a651', '018f3f7d-5b68-7aef-9e10-2d890fc8a612', 4, 'Compact case', 'Good passive isolation for calls; the case fits a jeans pocket.', 'Kabir', true, 'published', '2026-09-03T09:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

INSERT INTO questions (id, product_id, question, answer, moderation_status, created_at) VALUES
  ('018f3f7d-486c-7d73-9e13-83d8d0c75661', '018f3f7d-486c-7d73-9e13-83d8d0c75611', 'Does it stand upright when empty?', 'It stands upright when lightly packed, but may fold when fully empty.', 'published', '2026-09-02T09:00:00.000Z'),
  ('018f3f7d-5b68-7aef-9e10-2d890fc8a661', '018f3f7d-5b68-7aef-9e10-2d890fc8a612', 'Can each earbud be used independently?', 'Yes, either earbud can be used on its own after pairing.', 'published', '2026-09-04T09:00:00.000Z'),
  ('018f3f7d-6c72-7d73-9e13-83d8d0c75661', '018f3f7d-6c72-7d73-9e13-83d8d0c75616', 'Is assembly included?', NULL, 'published', '2026-09-05T09:00:00.000Z')
ON CONFLICT (id) DO NOTHING;

COMMIT;
