import type { ProductSeed } from "@veyra/contracts";

export const catalogSeedProducts = [
  {
    id: "018f3f7d-486c-7d73-9e13-83d8d0c75611",
    slug: "veyra-everyday-backpack",
    title: "Veyra Everyday Backpack",
    brand: "Veyra Basics",
    status: "published",
    price: { currency: "USD", amountMinor: 4599 },
    availableQuantity: 12
  },
  {
    id: "018f3f7d-5b68-7aef-9e10-2d890fc8a612",
    slug: "veyra-noise-isolating-earbuds",
    title: "Veyra Noise-Isolating Earbuds",
    brand: "Veyra Audio",
    status: "published",
    price: { currency: "USD", amountMinor: 7999 },
    availableQuantity: 7
  }
] satisfies ProductSeed[];
