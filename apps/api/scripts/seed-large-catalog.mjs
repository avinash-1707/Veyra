import { neon } from "@neondatabase/serverless";
const databaseUrl = process.env.DATABASE_URL;
if (databaseUrl === undefined || databaseUrl.trim() === "") throw new Error("DATABASE_URL is required to seed catalog data.");

const sql = neon(databaseUrl);
const productCount = Number.parseInt(process.env.VEYRA_SEED_PRODUCT_COUNT ?? "600", 10);
const batchSize = 100;
const categories = [
  [seededUuid("category", 1), "bags-seeded", "Seeded bags"],
  [seededUuid("category", 2), "audio-seeded", "Seeded audio"],
  [seededUuid("category", 3), "home-office-seeded", "Seeded home office"],
  [seededUuid("category", 4), "kitchen-seeded", "Seeded kitchen"],
  [seededUuid("category", 5), "fitness-seeded", "Seeded fitness"],
  [seededUuid("category", 6), "beauty-seeded", "Seeded beauty"],
  [seededUuid("category", 7), "books-seeded", "Seeded books"],
  [seededUuid("category", 8), "toys-seeded", "Seeded toys"],
  [seededUuid("category", 9), "fashion-seeded", "Seeded fashion"],
  [seededUuid("category", 10), "mobile-accessories-seeded", "Seeded mobile accessories"],
  [seededUuid("category", 11), "grocery-seeded", "Seeded grocery"],
  [seededUuid("category", 12), "outdoor-seeded", "Seeded outdoor"]
];
const sellers = Array.from({ length: 30 }, (_, index) => [seededUuid("seller", index + 1), `Seed Seller ${index + 1}`]);

await sql.query("CREATE EXTENSION IF NOT EXISTS pgcrypto", []);
await upsertCategories();
await upsertSellers();

for (let start = 0; start < productCount; start += batchSize) {
  const end = Math.min(start + batchSize, productCount);
  const products = [];
  const variants = [];
  const offers = [];
  const stock = [];
  const reviews = [];
  const questions = [];

  for (let index = start; index < end; index += 1) {
    const productNumber = index + 1;
    const category = categories[index % categories.length];
    const sellerOne = sellers[index % sellers.length];
    const sellerTwo = sellers[(index + 7) % sellers.length];
    const productId = seededUuid("product", productNumber);
    const variantOneId = seededUuid("variant-a", productNumber);
    const variantTwoId = seededUuid("variant-b", productNumber);
    const offerOneId = seededUuid("offer-a", productNumber);
    const offerTwoId = seededUuid("offer-b", productNumber);
    const price = 19_900 + (productNumber % 180) * 2_500;
    const rating = (3.5 + (productNumber % 15) / 10).toFixed(2);
    const reviewCount = 20 + (productNumber % 350);
    const slug = `seeded-product-${String(productNumber).padStart(4, "0")}`;
    products.push([productId, slug, `Seeded Product ${productNumber}`, `Seed Brand ${(productNumber % 24) + 1}`, "published", "INR", price, 40 + (productNumber % 60), category[0], `Seeded catalog item ${productNumber} for pagination and marketplace scale testing.`, `/catalog/seeded-${productNumber}.webp`, `Seeded product ${productNumber}`, rating, reviewCount, JSON.stringify({ Material: materialFor(index), Warranty: `${1 + (index % 3)} years`, "Seed batch": "large-catalog" })]);
    variants.push([variantOneId, productId, colorFor(index), JSON.stringify({ Color: colorFor(index) })], [variantTwoId, productId, sizeFor(index), JSON.stringify({ Size: sizeFor(index) })]);
    offers.push([offerOneId, productId, variantOneId, sellerOne[0], "INR", price, "new", "available", index % 3 === 0], [offerTwoId, productId, variantTwoId, sellerTwo[0], "INR", Math.max(9_900, price - 1_500), index % 5 === 0 ? "open_box" : "new", index % 11 === 0 ? "unavailable" : "available", index % 4 === 0]);
    stock.push([offerOneId, 20 + (index % 25)], [offerTwoId, index % 11 === 0 ? 0 : 12 + (index % 18)]);
    for (let reviewIndex = 0; reviewIndex < 5; reviewIndex += 1) reviews.push([seededUuid(`review-${reviewIndex}`, productNumber), productId, 3 + ((index + reviewIndex) % 3), `Useful seeded review ${reviewIndex + 1}`, `This seeded review exercises review listing and AI evidence for product ${productNumber}.`, `Seed Shopper ${reviewIndex + 1}`, true, "published"]);
    for (let questionIndex = 0; questionIndex < 2; questionIndex += 1) questions.push([seededUuid(`question-${questionIndex}`, productNumber), productId, `Seeded question ${questionIndex + 1} for product ${productNumber}?`, questionIndex === 0 ? "Yes, this seeded answer is available." : null, "published"]);
  }

  await insertProducts(products);
  await insertVariants(variants);
  await insertOffers(offers);
  await insertStock(stock);
  await insertReviews(reviews);
  await insertQuestions(questions);
  console.log(`Seeded products ${start + 1}-${end}`);
}

const counts = await sql`SELECT (SELECT count(*)::int FROM products) AS products, (SELECT count(*)::int FROM offers) AS offers, (SELECT count(*)::int FROM reviews) AS reviews, (SELECT count(*)::int FROM questions) AS questions`;
console.log(`Seed complete: ${JSON.stringify(counts[0])}`);

async function upsertCategories() {
  for (const [id, slug, name] of categories) await sql`INSERT INTO categories (id, slug, name) VALUES (${id}, ${slug}, ${name}) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name`;
}
async function upsertSellers() {
  for (const [id, name] of sellers) await sql`INSERT INTO sellers (id, name) VALUES (${id}, ${name}) ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name`;
}
async function insertProducts(rows) {
  await insertRows("products", ["id", "slug", "title", "brand", "status", "currency", "amount_minor", "available_quantity", "category_id", "description", "image_url", "image_alt", "rating", "review_count", "specifications"], rows, "ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, brand = EXCLUDED.brand, amount_minor = EXCLUDED.amount_minor, available_quantity = EXCLUDED.available_quantity, category_id = EXCLUDED.category_id, description = EXCLUDED.description, image_url = EXCLUDED.image_url, image_alt = EXCLUDED.image_alt, rating = EXCLUDED.rating, review_count = EXCLUDED.review_count, specifications = EXCLUDED.specifications");
}
async function insertVariants(rows) { await insertRows("product_variants", ["id", "product_id", "name", "attributes"], rows, "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, attributes = EXCLUDED.attributes"); }
async function insertOffers(rows) { await insertRows("offers", ["id", "product_id", "variant_id", "seller_id", "currency", "amount_minor", "condition", "availability", "expedited_eligible"], rows, "ON CONFLICT (id) DO UPDATE SET amount_minor = EXCLUDED.amount_minor, condition = EXCLUDED.condition, availability = EXCLUDED.availability, expedited_eligible = EXCLUDED.expedited_eligible"); }
async function insertStock(rows) { await insertRows("inventory_stock", ["offer_id", "available_quantity"], rows, "ON CONFLICT (offer_id) DO UPDATE SET available_quantity = EXCLUDED.available_quantity"); }
async function insertReviews(rows) { await insertRows("reviews", ["id", "product_id", "rating", "title", "body", "author_display_name", "verified_purchase", "moderation_status"], rows, "ON CONFLICT (id) DO NOTHING"); }
async function insertQuestions(rows) { await insertRows("questions", ["id", "product_id", "question", "answer", "moderation_status"], rows, "ON CONFLICT (id) DO NOTHING"); }

async function insertRows(table, columns, rows, conflictClause) {
  if (rows.length === 0) return;
  const values = [];
  const placeholders = rows.map((row) => `(${row.map((value) => { values.push(value); return `$${values.length}`; }).join(", ")})`).join(", ");
  await sql.query(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders} ${conflictClause}`, values);
}
function seededUuid(scope, number) {
  const left = hash(`${scope}:left`, number).padStart(8, "0").slice(0, 8);
  const middle = number.toString(16).padStart(4, "0").slice(-4);
  const right = hash(`${scope}:right`, number).padStart(12, "0").slice(0, 12);
  return `${left}-${middle}-7000-9000-${right}`;
}
function hash(scope, number) { let value = number; for (const char of scope) value = (value * 31 + char.charCodeAt(0)) >>> 0; return value.toString(16); }
function colorFor(index) { return ["Charcoal", "Blue", "Green", "Sand", "Red", "White"][index % 6]; }
function sizeFor(index) { return ["Small", "Medium", "Large", "One size"][index % 4]; }
function materialFor(index) { return ["Cotton", "Steel", "Recycled polyester", "Bamboo", "Aluminium", "Paper"][index % 6]; }
