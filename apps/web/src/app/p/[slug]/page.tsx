import Link from "next/link";

import { CatalogUnavailable } from "../../page";
import { formatInr, getEvaluation } from "../../lib/catalog";

export const dynamic = "force-dynamic";

export default async function ProductPage(props: PageProps<"/p/[slug]">) {
  const { slug } = await props.params;
  const evaluation = await getEvaluation(slug).catch(() => undefined);
  if (evaluation === undefined) return <CatalogUnavailable />;
  const product = evaluation.product;

  return <main className="page-shell product-detail"><Link href="/search">← Continue browsing</Link><p className="eyebrow">{product.category.name}</p><h1>{product.title}</h1><p>{product.brand} · {product.rating.toFixed(1)} ★ · {product.reviewCount} reviews</p><p>{product.description}</p><section aria-labelledby="offer-heading"><h2 id="offer-heading">Selected offer</h2><p>{formatInr(product.selectedOffer.price.amountMinor)} · {product.selectedOffer.availability} · {product.selectedOffer.sellerName}</p><p>{product.delivery.status === "address_required" ? "Add an Indian delivery address at checkout to see your simulated estimate." : product.delivery.disclosure}</p><p><Link href="/cart">View cart</Link></p></section><section aria-labelledby="variants-heading"><h2 id="variants-heading">Variants</h2><ul>{product.variants.map((variant) => <li key={variant.id}><Link href={`/p/${product.slug}?variant=${variant.id}`}>{variant.name}</Link></li>)}</ul></section><section aria-labelledby="specifications-heading"><h2 id="specifications-heading">Specifications</h2><dl>{Object.entries(product.specifications).map(([name, value]) => <div key={name}><dt>{name}</dt><dd>{value}</dd></div>)}</dl><p><Link href={`/compare?products=${product.slug}`}>Compare this product</Link></p></section><section aria-labelledby="reviews-heading"><h2 id="reviews-heading">Reviews</h2>{evaluation.reviews.length === 0 ? <p>No reviews yet.</p> : <ul>{evaluation.reviews.map((review) => <li key={review.id}><strong>{review.rating} ★ · {review.title}</strong><p>{review.body}</p><p>{review.authorDisplayName}{review.verifiedPurchase ? " · verified purchase" : ""}</p></li>)}</ul>}</section><section aria-labelledby="qa-heading"><h2 id="qa-heading">Questions & answers</h2>{evaluation.questions.length === 0 ? <p>No questions yet.</p> : <ul>{evaluation.questions.map((question) => <li key={question.id}><p><strong>Q:</strong> {question.question}</p><p><strong>A:</strong> {question.answer ?? "Not answered yet"}</p></li>)}</ul>}</section><section aria-labelledby="related-heading"><h2 id="related-heading">Related products</h2>{evaluation.relatedProducts.length === 0 ? <p>No related products in this local fixture.</p> : <ul>{evaluation.relatedProducts.map((related) => <li key={related.slug}><Link href={`/p/${related.slug}`}>{related.title}</Link></li>)}</ul>}</section></main>;
}
