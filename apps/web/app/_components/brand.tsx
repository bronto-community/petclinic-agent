import { PawPrintIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** App mark: paw in a yellow circle plus the PetClinic wordmark. */
export function AppMark({ className, size = "md" }: { readonly className?: string; readonly size?: "sm" | "md" }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-full bg-brand text-[#2C2E25]",
          size === "sm" ? "size-6" : "size-8",
        )}
      >
        <PawPrintIcon className={size === "sm" ? "size-3.5" : "size-4.5"} />
      </span>
      <span className={cn("font-bold font-serif text-foreground tracking-tight", size === "sm" ? "text-base" : "text-xl")}>
        PetClinic
      </span>
    </span>
  );
}

/** Small pill label. */
export function Eyebrow({ children }: { readonly children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center rounded-full bg-chip px-3 py-1.5 text-center font-mono text-bronze text-xs tracking-wide">
      {children}
    </span>
  );
}
