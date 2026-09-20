export type CatalogResult = {
  slug: string;
  title: string;
  brand: string;
  category: { name: string; slug: string };
  rating: number;
  reviewCount: number;
  selectedVariant: { id: string; name: string };
  selectedOffer: { id: string; sellerName: string; price: { amountMinor: number }; availability: "available" | "unavailable" | "withdrawn" };
};

type ApiEnvelope<Data> = { data: Data };

const apiOrigin = process.env.VEYRA_API_ORIGIN ?? "http://localhost:8787";

async function apiGet<Data>(path: string): Promise<Data> {
  const response = await fetch(`${apiOrigin}${path}`, { cache: "no-store" });
  if (!response.ok) throw new Error("Catalog service is unavailable.");
  const body: unknown = await response.json();
  if (!isEnvelope<Data>(body)) throw new Error("Catalog service returned an invalid response.");
  return body.data;
}

function isEnvelope<Data>(value: unknown): value is ApiEnvelope<Data> {
  return typeof value === "object" && value !== null && "data" in value;
}

export function formatInr(amountMinor: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amountMinor / 100);
}

export async function getCategories() {
  return apiGet<Array<{ slug: string; name: string }>>("/v1/categories");
}

export async function searchCatalog(search: URLSearchParams) {
  const query = search.toString();
  return apiGet<{ query: string; results: CatalogResult[]; total: number }>(`/v1/search${query.length > 0 ? `?${query}` : ""}`);
}

export async function getProduct(slug: string, search: URLSearchParams) {
  const query = search.toString();
  return apiGet<CatalogResult & {
    description: string;
    specifications: Record<string, string>;
    variants: Array<{ id: string; name: string }>;
    offers: Array<{ id: string; sellerName: string; price: { amountMinor: number }; availability: string }>;
    delivery: { status: "address_required" | "available" | "unavailable"; disclosure: string };
  }>(`/v1/products/${encodeURIComponent(slug)}${query.length > 0 ? `?${query}` : ""}`);
}

export async function getEvaluation(slug: string) {
  return apiGet<{
    product: Awaited<ReturnType<typeof getProduct>>;
    reviews: Array<{ id: string; rating: number; title: string; body: string; authorDisplayName: string; verifiedPurchase: boolean }>;
    questions: Array<{ id: string; question: string; answer: string | null }>;
    relatedProducts: Array<CatalogResult & { specifications: Record<string, string | null> }>;
  }>(`/v1/products/${encodeURIComponent(slug)}/evaluation`);
}

export async function compareCatalog(slugs: string[]) {
  return apiGet<{
    products: Array<CatalogResult & { specifications: Record<string, string | null> }>;
    fieldOrder: string[];
  }>(`/v1/compare?products=${encodeURIComponent(slugs.join(","))}`);
}

export type Cart = {
  id: string;
  items: Array<{ id: string; product: CatalogResult; quantity: number; lineSubtotal: { amountMinor: number }; lineDiscount: { amountMinor: number }; availabilityStatus: string }>;
  savedForLater: Array<{ id: string; product: CatalogResult; quantity: number }>;
  totals: { itemSubtotal: { amountMinor: number }; discountTotal: { amountMinor: number }; shipping: { amountMinor: number }; estimatedTax: { amountMinor: number }; grandTotal: { amountMinor: number }; disclosure: string };
  itemCount: number;
};

export async function getCart() {
  return apiGet<Cart>("/v1/cart");
}
