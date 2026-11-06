import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-50";

const variants = {
  primary: "bg-brand-600 text-white hover:bg-brand-700",
  outline: "border border-brand-600 bg-surface text-brand-600 hover:bg-brand-50",
  ghost: "text-ink-muted hover:bg-canvas",
} as const;

/** Heights are part of the design system: sm = 36px, md = 40px. */
const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
} as const;

type Common = { variant?: keyof typeof variants; size?: keyof typeof sizes; className?: string };
type AsButton = Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };
type AsLink = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

/** The only button in the product. Pass `href` to render a link. */
export function Button(props: AsButton | AsLink) {
  const { variant = "primary", size = "md", className, ...rest } = props;
  const classes = cn(base, variants[variant], sizes[size], className);
  if (rest.href !== undefined) {
    return <a {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)} className={classes} />;
  }
  return <button type="button" {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} className={classes} />;
}
