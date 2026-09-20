export type SearchSuggestion = {
  type: "query" | "category";
  value: string;
};

export type CatalogResult = {
  slug: string;
  title: string;
  brand: string;
  category: { name: string; slug: string };
  rating: number;
  reviewCount: number;
  selectedVariant: { id: string; name: string };
  selectedOffer: {
    id: string;
    sellerName: string;
    price: { amountMinor: number };
    availability: "available" | "unavailable" | "withdrawn";
  };
};

export type Category = { slug: string; name: string };

export type SearchResult = {
  query: string;
  results: CatalogResult[];
  total: number;
};

export type Product = CatalogResult & {
  description: string;
  specifications: Record<string, string>;
  variants: Array<{ id: string; name: string }>;
  offers: Array<{ id: string; sellerName: string; price: { amountMinor: number }; availability: string }>;
  delivery: { status: "address_required" | "available" | "unavailable"; disclosure: string };
};

export type Paginated<Data> = {
  items: Data[];
  pageInfo: { nextCursor: string | null; hasNextPage: boolean; limit: number };
};

export type Cart = {
  id: string;
  items: Array<{
    id: string;
    product: CatalogResult;
    quantity: number;
    lineSubtotal: { amountMinor: number };
    lineDiscount: { amountMinor: number };
    availabilityStatus: string;
  }>;
  savedForLater: Array<{ id: string; product: CatalogResult; quantity: number }>;
  totals: {
    itemSubtotal: { amountMinor: number };
    discountTotal: { amountMinor: number };
    shipping: { amountMinor: number };
    estimatedTax: { amountMinor: number };
    grandTotal: { amountMinor: number };
    disclosure: string;
  };
  itemCount: number;
};

export type Order = {
  id: string;
  status: "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled";
  paymentStatus: "authorized" | "failed" | "voided";
  shippingAddress: {
    recipientName: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pinCode: string;
  };
  deliverySpeed: "standard" | "expedited";
  items: Array<{
    productTitle: string;
    variantName: string;
    sellerName: string;
    quantity: number;
    unitPrice: { amountMinor: number };
    lineSubtotal: { amountMinor: number };
  }>;
  totals: Cart["totals"];
  createdAt: string;
  history: Array<{ at: string; status: string; message: string }>;
};

export type ReturnRequest = {
  id: string;
  orderId: string;
  item: { cartLineId: string; productTitle: string; variantName: string };
  reason: string;
  state: "requested" | "received" | "approved" | "refunded" | "rejected" | "cancelled";
  refundStatus: "not_started" | "pending" | "refunded";
  createdAt: string;
  history: Array<{ at: string; status: string; message: string }>;
};
