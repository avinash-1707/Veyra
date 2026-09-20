import Link from "next/link";

import { CatalogUnavailable } from "../../page";
import { formatInr, getProduct } from "../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage(props: PageProps<"/p/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const parameters = new URLSearchParams();
  if (typeof searchParams.offer === "string") parameters.set("offer", searchParams.offer);
  if (typeof searchParams.variant === "string") parameters.set("variant", searchParams.variant);
  const product = await getProduct(slug, parameters).catch(() => undefined);
  if (product === undefined) return <CatalogUnavailable />;

  return <main className="page-shell product-detail"><Link href="/search">← Continue browsing</Link><p className="eyebrow">{product.category.name}</p><h1>{product.title}</h1><p>{product.brand} · {product.rating.toFixed(1)} ★</p><p>{product.description}</p><section aria-labelledby="offer-heading"><h2 id="offer-heading">Selected offer</h2><p>{formatInr(product.selectedOffer.price.amountMinor)} · {product.selectedOffer.availability}</p><p>{product.delivery.status === "address_required" ? "Add an Indian delivery address at checkout to see your simulated estimate." : product.delivery.disclosure}</p></section><section aria-labelledby="variants-heading"><h2 id="variants-heading">Variants</h2><ul>{product.variants.map((variant) => <li key={variant.id}><Link href={`/p/${product.slug}?variant=${variant.id}`}>{variant.name}</Link></li>)}</ul></section><section aria-labelledby="specifications-heading"><h2 id="specifications-heading">Specifications</h2><dl>{Object.entries(product.specifications).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl></section></main>;
}
