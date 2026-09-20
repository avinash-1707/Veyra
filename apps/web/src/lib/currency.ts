export function formatInr(amountMinor: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amountMinor / 100);
}
