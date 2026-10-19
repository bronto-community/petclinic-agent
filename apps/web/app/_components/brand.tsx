import { cn } from "@/lib/utils";

/** Bronto horizontal logo; swaps to a cream wordmark in dark mode. */
export function BrontoLogo({ className }: { readonly className?: string }) {
  return (
    <span className={cn("inline-flex", className)}>
      {/* biome-ignore lint/performance/noImgElement: static SVG */}
      <img alt="Bronto" className="h-full w-auto dark:hidden" src="/bronto-logo.svg" />
      {/* biome-ignore lint/performance/noImgElement: static SVG */}
      <img alt="Bronto" className="hidden h-full w-auto dark:block" src="/bronto-logo-dark.svg" />
    </span>
  );
}

/** Small pill label in the bronto.io style. */
export function Eyebrow({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-chip px-3 py-1.5 text-center font-mono text-bronze text-xs tracking-wide">
      {children}
    </span>
  );
}
