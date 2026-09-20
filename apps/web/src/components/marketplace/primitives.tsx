import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type SectionShellProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function SectionShell({ eyebrow, title, description, action, children, className }: SectionShellProps) {
  return (
    <section className={cn("py-8", className)} aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-heading`}>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-heading`} className="mt-2">
            {title}
          </h2>
          {description ? <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

type ProductCardProps = {
  href: string;
  title: string;
  brand: string;
  category: string;
  price?: string;
  rating?: string;
  availability?: string;
  delivery?: string;
  evidence?: string;
  actionLabel?: string;
};

export function ProductCard({
  href,
  title,
  brand,
  category,
  price,
  rating,
  availability,
  delivery,
  evidence,
  actionLabel = "View product"
}: ProductCardProps) {
  return (
    <Card className="h-full border-border/90 shadow-[var(--shadow-card)] transition-[transform,box-shadow,border-color] duration-200 ease-[var(--motion-standard)] hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow">{category}</p>
            <CardTitle className="mt-2 text-lg">
              <Link className="text-foreground no-underline" href={href}>
                {title}
              </Link>
            </CardTitle>
            <CardDescription>{brand}</CardDescription>
          </div>
          {rating ? <Badge variant="secondary">{rating}</Badge> : null}
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-muted-foreground">
        {price ? <p className="text-xl font-semibold text-foreground">{price}</p> : null}
        {availability ? <p>{availability}</p> : null}
        {delivery ? <p>{delivery}</p> : null}
        {evidence ? <p className="rounded-lg border border-border bg-secondary p-3">{evidence}</p> : null}
      </CardContent>
      <CardFooter>
        <Link className={cn(buttonVariants({ size: "sm", variant: "outline" }))} href={href}>
          {actionLabel}
        </Link>
      </CardFooter>
    </Card>
  );
}

type StatePanelTone = "neutral" | "success" | "warning" | "danger" | "info";

type StatePanelProps = {
  title: string;
  description: string;
  tone?: StatePanelTone;
  action?: React.ReactNode;
  children?: React.ReactNode;
};

const stateToneClass: Record<StatePanelTone, string> = {
  neutral: "border-border",
  success: "border-[color:var(--foundation-success)]",
  warning: "border-[color:var(--foundation-warning)]",
  danger: "border-destructive",
  info: "border-[color:var(--foundation-info)]"
};

export function StatePanel({ title, description, tone = "neutral", action, children }: StatePanelProps) {
  return (
    <Card
      className={cn("max-w-2xl border shadow-[var(--shadow-card)]", stateToneClass[tone])}
      role={tone === "danger" ? "alert" : "status"}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
      {action ? <CardFooter>{action}</CardFooter> : null}
    </Card>
  );
}

type GuidanceEvidencePanelProps = {
  title: string;
  summary: string;
  evidence: readonly string[];
  fallback?: string;
};

export function GuidanceEvidencePanel({ title, summary, evidence, fallback }: GuidanceEvidencePanelProps) {
  return (
    <aside
      className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]"
      aria-labelledby="guidance-panel-heading"
    >
      <p className="eyebrow">Optional guidance</p>
      <h2 id="guidance-panel-heading" className="mt-2 text-2xl">
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{summary}</p>
      <Separator className="my-5" />
      <ul className="grid gap-3 text-sm text-muted-foreground">
        {evidence.map((item) => (
          <li key={item} className="rounded-lg border border-border bg-secondary p-3">
            {item}
          </li>
        ))}
      </ul>
      {fallback ? <p className="mt-4 text-sm text-muted-foreground">{fallback}</p> : null}
    </aside>
  );
}

type TotalsCardProps = {
  title?: string;
  rows: readonly { label: string; value: string; helper?: string }[];
  total: { label: string; value: string };
  disclosure?: string;
};

export function TotalsCard({ title = "Server totals", rows, total, disclosure }: TotalsCardProps) {
  return (
    <Card className="border-border shadow-[var(--shadow-card)]" aria-live="polite">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3">
          {rows.map((row) => (
            <div key={row.label} className="marketplace-dl-row">
              <dt>{row.label}</dt>
              <dd>
                {row.value}
                {row.helper ? <span className="block text-xs text-muted-foreground">{row.helper}</span> : null}
              </dd>
            </div>
          ))}
          <Separator />
          <div className="marketplace-dl-row text-base">
            <dt>{total.label}</dt>
            <dd className="font-semibold text-foreground">{total.value}</dd>
          </div>
        </dl>
        {disclosure ? <p className="mt-4 text-sm text-muted-foreground">{disclosure}</p> : null}
      </CardContent>
    </Card>
  );
}

type TimelineListProps = {
  items: readonly { title: string; description: string; meta?: string; state?: "complete" | "current" | "pending" }[];
};

export function TimelineList({ items }: TimelineListProps) {
  return (
    <ol className="grid gap-3">
      {items.map((item, index) => (
        <li
          key={`${item.title}-${index}`}
          className="grid grid-cols-[auto_1fr] gap-3 rounded-xl border border-border bg-card p-4"
        >
          <span
            className={cn(
              "mt-1 size-3 rounded-full border",
              item.state === "complete"
                ? "border-[color:var(--foundation-success)] bg-[color:var(--foundation-success)]"
                : null,
              item.state === "current" ? "border-primary bg-primary" : null,
              item.state === "pending" || item.state === undefined ? "border-border bg-secondary" : null
            )}
            aria-hidden="true"
          />
          <span>
            <span className="block font-semibold text-foreground">{item.title}</span>
            <span className="block text-sm text-muted-foreground">{item.description}</span>
            {item.meta ? <span className="mt-1 block text-xs text-muted-foreground">{item.meta}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  );
}

type SearchPrimitiveProps = {
  action: string;
  id: string;
  name?: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
};

export function SearchPrimitive({
  action,
  id,
  name = "q",
  label,
  placeholder,
  defaultValue,
  submitLabel = "Search"
}: SearchPrimitiveProps) {
  return (
    <form action={action} className="search-form">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <Input id={id} name={name} placeholder={placeholder} defaultValue={defaultValue} />
      <Button type="submit">{submitLabel}</Button>
    </form>
  );
}

export function ProductCardSkeleton() {
  return (
    <Card className="border-border shadow-[var(--shadow-card)]" aria-label="Loading product">
      <CardHeader>
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-4/5" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="grid gap-3">
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </CardContent>
    </Card>
  );
}
