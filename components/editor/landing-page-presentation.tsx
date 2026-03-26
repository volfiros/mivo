import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { clsx } from "clsx";

export type LandingPageSectionVariant =
  | "hero"
  | "feature-grid"
  | "two-column"
  | "image-with-copy"
  | "quote"
  | "cta"
  | "callout"
  | "text";

export const landingPageImageVisualClassName =
  "min-h-[280px] w-full bg-cover bg-center md:min-h-[420px]";
export const landingPageImagePlaceholderClassName =
  "flex min-h-[280px] items-center justify-center px-6 text-sm text-[var(--text-soft)] md:min-h-[420px]";
export const landingPageColumnClassName = "landing-page-column min-w-0";
export const landingPageColumnContentClassName = clsx(
  "landing-page-flow min-w-0",
  "[&>h2]:mb-4 [&>h2]:text-[2rem] [&>h2]:leading-[1.02] [&>h2]:tracking-[-0.045em]",
  "[&>h3]:mb-3 [&>h3]:text-[1.55rem] [&>h3]:leading-[1.08] [&>h3]:tracking-[-0.04em]",
  "[&>p]:text-[1rem] [&>p]:leading-8 [&>p]:text-[var(--text-soft)]",
);
export const landingPageFeatureCardClassName =
  "landing-page-feature-card rounded-[22px] border border-[var(--border)] bg-[rgba(11,17,13,0.88)] px-5 py-6";
export const landingPageFeatureCardContentClassName = clsx(
  "landing-page-flow min-w-0",
  "[&>h3]:mb-3 [&>h3]:text-[1.5rem] [&>h3]:leading-[1.08] [&>h3]:tracking-[-0.04em]",
  "[&>p]:text-[1rem] [&>p]:leading-8 [&>p]:text-[var(--text-soft)]",
);

export function getLandingPageSectionBodyClass(
  variant: LandingPageSectionVariant,
) {
  switch (variant) {
    case "hero":
      return clsx(
        "landing-page-flow space-y-6 border-t border-[var(--border)] pt-8",
        "[&>p:first-child]:max-w-[11rem] [&>p:first-child]:text-[0.76rem] [&>p:first-child]:font-medium [&>p:first-child]:uppercase [&>p:first-child]:tracking-[0.2em] [&>p:first-child]:text-[var(--text-soft)]",
        "[&>h1]:max-w-[52rem] [&>h1]:text-[clamp(3.6rem,7vw,6.7rem)] [&>h1]:leading-[0.95] [&>h1]:tracking-[-0.055em] [&>h1]:text-white",
        "[&>p:nth-of-type(2)]:max-w-[38rem] [&>p:nth-of-type(2)]:text-[1.08rem] [&>p:nth-of-type(2)]:leading-8 [&>p:nth-of-type(2)]:text-[var(--text-soft)] md:[&>p:nth-of-type(2)]:text-[1.24rem]",
        "[&>p:last-child]:inline-flex [&>p:last-child]:w-fit [&>p:last-child]:border [&>p:last-child]:border-[rgba(66,230,164,0.24)] [&>p:last-child]:px-4 [&>p:last-child]:py-2.5 [&>p:last-child]:text-sm [&>p:last-child]:font-semibold [&>p:last-child]:tracking-[0.04em] [&>p:last-child]:text-white",
      );
    case "feature-grid":
      return "landing-page-flow grid gap-5 border-t border-[var(--border)] pt-8 md:grid-cols-2";
    case "two-column":
      return "landing-page-flow grid gap-8 border-t border-[var(--border)] pt-8 md:grid-cols-2";
    case "image-with-copy":
      return "landing-page-flow grid gap-8 border-t border-[var(--border)] pt-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] md:items-center";
    case "quote":
      return clsx(
        "landing-page-flow space-y-4 border-t border-[var(--border)] pt-8",
        "[&>blockquote]:border-l-2 [&>blockquote]:border-[var(--accent-strong)]/40 [&>blockquote]:pl-6",
        "[&>blockquote>p]:text-[1.3rem] [&>blockquote>p]:leading-9 [&>blockquote>p]:tracking-[-0.02em] [&>blockquote>p]:text-white",
        "[&>p]:text-[1rem] [&>p]:font-medium [&>p]:tracking-[-0.01em] [&>p]:text-[var(--text-soft)]",
      );
    case "cta":
      return clsx(
        "landing-page-flow space-y-4 border-t border-[var(--border)] pt-8",
        "[&>.landing-page-cta-shell]:space-y-4 [&>.landing-page-cta-shell]:rounded-[22px] [&>.landing-page-cta-shell]:border [&>.landing-page-cta-shell]:border-[rgba(66,230,164,0.16)] [&>.landing-page-cta-shell]:bg-[rgba(11,18,13,0.9)] [&>.landing-page-cta-shell]:px-6 [&>.landing-page-cta-shell]:py-6 md:[&>.landing-page-cta-shell]:px-8 md:[&>.landing-page-cta-shell]:py-7",
        "[&>.landing-page-cta-shell>h2]:text-[2rem] [&>.landing-page-cta-shell>h2]:leading-[1.02] [&>.landing-page-cta-shell>h2]:tracking-[-0.045em]",
        "[&>.landing-page-cta-shell>p:first-of-type]:max-w-[40rem] [&>.landing-page-cta-shell>p:first-of-type]:text-[1rem] [&>.landing-page-cta-shell>p:first-of-type]:leading-8 [&>.landing-page-cta-shell>p:first-of-type]:text-[var(--text-soft)]",
        "[&>.landing-page-cta-shell>p:last-child]:inline-flex [&>.landing-page-cta-shell>p:last-child]:w-fit [&>.landing-page-cta-shell>p:last-child]:border [&>.landing-page-cta-shell>p:last-child]:border-[rgba(66,230,164,0.24)] [&>.landing-page-cta-shell>p:last-child]:px-4 [&>.landing-page-cta-shell>p:last-child]:py-2.5 [&>.landing-page-cta-shell>p:last-child]:text-sm [&>.landing-page-cta-shell>p:last-child]:font-semibold [&>.landing-page-cta-shell>p:last-child]:tracking-[0.04em] [&>.landing-page-cta-shell>p:last-child]:text-white",
      );
    case "callout":
      return clsx(
        "landing-page-flow border-t border-[var(--border)] pt-8",
        "[&>.landing-page-callout-shell]:space-y-4 [&>.landing-page-callout-shell]:border-l-2 [&>.landing-page-callout-shell]:border-[var(--accent-strong)]/45 [&>.landing-page-callout-shell]:pl-6",
        "[&>.landing-page-callout-shell>h3]:text-[1.45rem] [&>.landing-page-callout-shell>h3]:leading-[1.08] [&>.landing-page-callout-shell>h3]:tracking-[-0.04em]",
        "[&>.landing-page-callout-shell>p]:text-[1rem] [&>.landing-page-callout-shell>p]:leading-8 [&>.landing-page-callout-shell>p]:text-[var(--text-soft)]",
      );
    default:
      return clsx(
        "landing-page-flow space-y-4 border-t border-[var(--border)] pt-8",
        "[&>h2]:text-[2rem] [&>h2]:leading-[1.02] [&>h2]:tracking-[-0.045em]",
        "[&>h3]:text-[1.42rem] [&>h3]:leading-[1.08] [&>h3]:tracking-[-0.04em]",
        "[&>p]:text-[1rem] [&>p]:leading-8 [&>p]:text-[var(--text-soft)]",
      );
  }
}

export function LandingPageViewport({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx("mx-auto w-full max-w-[1180px]", className)}
    >
      {children}
    </div>
  );
}

export function LandingPageSurface({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "landing-page-surface overflow-hidden rounded-[28px] border border-[var(--border)]/70 px-6 py-8 md:px-10 md:py-12",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingPageSection({
  label,
  variant,
  className,
  children,
}: {
  label: ReactNode;
  variant: LandingPageSectionVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={clsx("mb-16 last:mb-0", className)}>
      <LandingPageSectionLabel>{label}</LandingPageSectionLabel>
      <LandingPageSectionBody variant={variant}>
        {children}
      </LandingPageSectionBody>
    </section>
  );
}

export function LandingPageSectionLabel({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "mb-4 text-[0.72rem] font-medium uppercase tracking-[0.18em] text-[var(--text-soft)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingPageSectionBody({
  variant,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div"> & {
  variant: LandingPageSectionVariant;
}) {
  const content =
    variant === "cta" ? (
      <div className="landing-page-cta-shell">{children}</div>
    ) : variant === "callout" ? (
      <div className="landing-page-callout-shell">{children}</div>
    ) : (
      children
    );

  return (
    <div
      {...props}
      className={clsx(getLandingPageSectionBodyClass(variant), className)}
    >
      {content}
    </div>
  );
}

export function LandingPageColumn({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        landingPageColumnClassName,
        landingPageColumnContentClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingPageFeatureCard({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        landingPageFeatureCardClassName,
        landingPageFeatureCardContentClassName,
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LandingPageImageFrame({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        "overflow-hidden rounded-[26px] border border-[var(--border)] bg-[#0d1310]",
        className,
      )}
    >
      {children}
    </div>
  );
}
