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

export const REPO_URL =
  process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/bronto-community/petclinic-agent";

/** Link to the source repository, with the GitHub mark. */
export function RepoLink({ className, label = "Source on GitHub" }: { readonly className?: string; readonly label?: string }) {
  return (
    <a
      className={cn(
        "inline-flex items-center gap-1.5 text-muted-foreground text-xs underline-offset-4 transition-colors hover:text-foreground hover:underline",
        className,
      )}
      href={REPO_URL}
      rel="noreferrer"
      target="_blank"
    >
      <svg aria-hidden="true" className="size-3.5 fill-current" viewBox="0 0 16 16">
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
      </svg>
      {label}
    </a>
  );
}
