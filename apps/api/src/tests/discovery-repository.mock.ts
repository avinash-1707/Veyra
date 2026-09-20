import type { Category, ProductOffer, ProductQuestion, ProductReview, ProductVariant } from "@veyra/contracts";

export type CatalogProduct = {
  id: string;
  slug: string;
  title: string;
  brand: string;
  category: Category;
  rating: number;
  reviewCount: number;
  image: { alt: string; url: string };
  description: string;
  specifications: Record<string, string>;
  variants: ProductVariant[];
  offers: ProductOffer[];
  reviews: ProductReview[];
  questions: ProductQuestion[];
};

const categories: Category[] = [
  { slug: "bags", name: "Bags" },
  { slug: "audio", name: "Audio" },
  { slug: "home-office", name: "Home office" }
];

const products: CatalogProduct[] = [
  {
    id: "018f3f7d-486c-7d73-9e13-83d8d0c75611",
    slug: "veyra-everyday-backpack",
    title: "Veyra Everyday Backpack",
    brand: "Veyra Basics",
    category: categories[0]!,
    rating: 4.4,
    reviewCount: 218,
    image: { url: "/catalog/everyday-backpack.webp", alt: "Charcoal Veyra Everyday Backpack" },
    description: "A structured daypack with a padded laptop sleeve and weather-resistant outer fabric.",
    specifications: {
      Capacity: "22 L",
      "Laptop sleeve": "Fits up to 15 inch",
      Material: "Recycled polyester"
    },
    variants: [
      { id: "018f3f7d-486c-7d73-9e13-83d8d0c75612", name: "Charcoal", attributes: { Color: "Charcoal" } },
      { id: "018f3f7d-486c-7d73-9e13-83d8d0c75613", name: "Sand", attributes: { Color: "Sand" } }
    ],
    offers: [
      {
        id: "018f3f7d-486c-7d73-9e13-83d8d0c75614",
        variantId: "018f3f7d-486c-7d73-9e13-83d8d0c75612",
        sellerName: "Veyra Retail",
        price: { currency: "INR", amountMinor: 459900 },
        condition: "new",
        availability: "available",
        expeditedEligible: true
      },
      {
        id: "018f3f7d-486c-7d73-9e13-83d8d0c75615",
        variantId: "018f3f7d-486c-7d73-9e13-83d8d0c75613",
        sellerName: "Veyra Retail",
        price: { currency: "INR", amountMinor: 459900 },
        condition: "new",
        availability: "available",
        expeditedEligible: true
      }
    ],
    reviews: [
      {
        id: "018f3f7d-486c-7d73-9e13-83d8d0c75651",
        productId: "018f3f7d-486c-7d73-9e13-83d8d0c75611",
        rating: 5,
        title: "Reliable work bag",
        body: "The laptop sleeve is snug and the fabric has handled daily commute rain.",
        authorDisplayName: "Nisha",
        verifiedPurchase: true,
        createdAt: "2026-09-01T09:00:00.000Z"
      }
    ],
    questions: [
      {
        id: "018f3f7d-486c-7d73-9e13-83d8d0c75661",
        productId: "018f3f7d-486c-7d73-9e13-83d8d0c75611",
        question: "Does it stand upright when empty?",
        answer: "It stands upright when lightly packed, but may fold when fully empty.",
        createdAt: "2026-09-02T09:00:00.000Z"
      }
    ]
  },
  {
    id: "018f3f7d-5b68-7aef-9e10-2d890fc8a612",
    slug: "veyra-noise-isolating-earbuds",
    title: "Veyra Noise-Isolating Earbuds",
    brand: "Veyra Audio",
    category: categories[1]!,
    rating: 4.2,
    reviewCount: 143,
    image: { url: "/catalog/earbuds.webp", alt: "Veyra Noise-Isolating Earbuds in their charging case" },
    description: "Wireless earbuds with passive noise isolation and a compact charging case.",
    specifications: {
      Battery: "24 hours with case",
      Connectivity: "Bluetooth 5.3",
      "Water resistance": "IPX4"
    },
    variants: [{ id: "018f3f7d-5b68-7aef-9e10-2d890fc8a613", name: "Midnight", attributes: { Color: "Midnight" } }],
    offers: [
      {
        id: "018f3f7d-5b68-7aef-9e10-2d890fc8a614",
        variantId: "018f3f7d-5b68-7aef-9e10-2d890fc8a613",
        sellerName: "Veyra Retail",
        price: { currency: "INR", amountMinor: 799900 },
        condition: "new",
        availability: "available",
        expeditedEligible: false
      },
      {
        id: "018f3f7d-5b68-7aef-9e10-2d890fc8a615",
        variantId: "018f3f7d-5b68-7aef-9e10-2d890fc8a613",
        sellerName: "Audio Outlet",
        price: { currency: "INR", amountMinor: 749900 },
        condition: "open_box",
        availability: "withdrawn",
        expeditedEligible: false
      }
    ],
    reviews: [
      {
        id: "018f3f7d-5b68-7aef-9e10-2d890fc8a651",
        productId: "018f3f7d-5b68-7aef-9e10-2d890fc8a612",
        rating: 4,
        title: "Compact case",
        body: "Good passive isolation for calls; the case fits a jeans pocket.",
        authorDisplayName: "Kabir",
        verifiedPurchase: true,
        createdAt: "2026-09-03T09:00:00.000Z"
      }
    ],
    questions: [
      {
        id: "018f3f7d-5b68-7aef-9e10-2d890fc8a661",
        productId: "018f3f7d-5b68-7aef-9e10-2d890fc8a612",
        question: "Can each earbud be used independently?",
        answer: "Yes, either earbud can be used on its own after pairing.",
        createdAt: "2026-09-04T09:00:00.000Z"
      }
    ]
  },
  {
    id: "018f3f7d-6c72-7d73-9e13-83d8d0c75616",
    slug: "veyra-ergonomic-desk-chair",
    title: "Veyra Ergonomic Desk Chair",
    brand: "Veyra Home",
    category: categories[2]!,
    rating: 4.6,
    reviewCount: 89,
    image: { url: "/catalog/desk-chair.webp", alt: "Veyra Ergonomic Desk Chair in graphite" },
    description: "An adjustable desk chair with lumbar support and breathable mesh back.",
    specifications: {
      Material: "Mesh and fabric",
      "Seat height": "44–54 cm",
      Warranty: "2 years"
    },
    variants: [{ id: "018f3f7d-6c72-7d73-9e13-83d8d0c75617", name: "Graphite", attributes: { Color: "Graphite" } }],
    offers: [
      {
        id: "018f3f7d-6c72-7d73-9e13-83d8d0c75618",
        variantId: "018f3f7d-6c72-7d73-9e13-83d8d0c75617",
        sellerName: "Veyra Home",
        price: { currency: "INR", amountMinor: 1299900 },
        condition: "new",
        availability: "unavailable",
        expeditedEligible: false
      }
    ],
    reviews: [],
    questions: [
      {
        id: "018f3f7d-6c72-7d73-9e13-83d8d0c75661",
        productId: "018f3f7d-6c72-7d73-9e13-83d8d0c75616",
        question: "Is assembly included?",
        answer: null,
        createdAt: "2026-09-05T09:00:00.000Z"
      }
    ]
  }
];

export async function listProductSeeds() {
  return [
    {
      id: "018f3f7d-486c-7d73-9e13-83d8d0c75611",
      slug: "veyra-everyday-backpack",
      title: "Veyra Everyday Backpack",
      brand: "Veyra Basics",
      status: "published",
      price: { currency: "INR", amountMinor: 459900 },
      availableQuantity: 6
    },
    {
      id: "018f3f7d-5b68-7aef-9e10-2d890fc8a612",
      slug: "veyra-noise-isolating-earbuds",
      title: "Veyra Noise-Isolating Earbuds",
      brand: "Veyra Audio",
      status: "published",
      price: { currency: "INR", amountMinor: 799900 },
      availableQuantity: 5
    },
    {
      id: "018f3f7d-6c72-7d73-9e13-83d8d0c75616",
      slug: "veyra-ergonomic-desk-chair",
      title: "Veyra Ergonomic Desk Chair",
      brand: "Veyra Home",
      status: "published",
      price: { currency: "INR", amountMinor: 1299900 },
      availableQuantity: 0
    }
  ];
}

export async function listCategories(): Promise<Category[]> {
  return categories;
}

export async function findProductBySlug(slug: string): Promise<CatalogProduct | undefined> {
  return products.find((product) => product.slug === slug);
}

export async function findProductByOffer(offerId: string): Promise<CatalogProduct | undefined> {
  return products.find((product) => product.offers.some((offer) => offer.id === offerId));
}

export async function findProductsBySlugs(slugs: string[]): Promise<CatalogProduct[]> {
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  return slugs.flatMap((slug) => {
    const product = bySlug.get(slug);
    return product === undefined ? [] : [product];
  });
}

export async function findRelatedProducts(categorySlug: string, excludedSlug: string): Promise<CatalogProduct[]> {
  return products
    .filter((product) => product.category.slug === categorySlug && product.slug !== excludedSlug)
    .slice(0, 4);
}

export async function searchCatalog(query: string): Promise<CatalogProduct[]> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (normalizedQuery.length === 0) return products;
  return products.filter((product) =>
    [product.title, product.brand, product.category.name, product.description, ...Object.values(product.specifications)]
      .join(" ")
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  );
}

export async function searchSuggestions(query: string): Promise<Array<{ type: "category" | "query"; value: string }>> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return [
    ...categories
      .filter((category) => category.name.toLocaleLowerCase().includes(normalizedQuery))
      .map((category) => ({ type: "category" as const, value: category.name })),
    ...products
      .filter((product) => product.title.toLocaleLowerCase().includes(normalizedQuery))
      .map((product) => ({ type: "query" as const, value: product.title }))
  ].slice(0, 8);
}
