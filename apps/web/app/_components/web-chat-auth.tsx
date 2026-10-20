"use client";

import { LogOutIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";


/** Signs in with Vercel; signed-in users get the Premium plan. */
export function UpgradeButton({ className, size = "default" }: { readonly className?: string; readonly size?: "sm" | "default" }) {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);
    try {
      const result = await authClient.signIn.social({ callbackURL: window.location.pathname, provider: "vercel" });
      if (!result.error) return;
    } catch {
      // Falls through to the error state below.
    }
    setPending(false);
    setFailed(true);
  }

  return (
    <Button className={cn("gap-2", className)} disabled={pending} onClick={signIn} size={size} type="button">
      <SparklesIcon className="size-3.5" />
      {pending ? "Redirecting…" : failed ? "Sign-in failed, try again" : "Sign in for Premium"}
    </Button>
  );
}

export function AccountControl({
  email,
  image,
  name,
}: {
  readonly email: string;
  readonly image?: string | null;
  readonly name: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [pending, setPending] = useState(false);
  const initials = getInitials(name, email);

  async function signOut() {
    setPending(true);
    try {
      await authClient.signOut({
        fetchOptions: {
          onError: () => setPending(false),
          onSuccess: () => window.location.assign("/"),
        },
      });
    } catch {
      setPending(false);
    }
  }

  return (
    <div className="fixed top-3 left-4 z-30 flex h-8 items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            aria-label={`Open account menu for ${name}`}
            className="relative size-7 cursor-pointer overflow-hidden rounded-full p-0"
            size="icon-sm"
            variant="ghost"
          >
            {image && !imageFailed ? (
              <img
                alt=""
                className="size-full object-cover"
                onError={() => setImageFailed(true)}
                src={image}
              />
            ) : (
              <span aria-hidden="true" className="font-medium text-xs">
                {initials}
              </span>
            )}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full border border-black/20 dark:border-white/25"
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <div className="min-w-0 px-2 py-1.5 text-sm">
            <span className="block truncate font-medium leading-5" title={name}>
              {name}
            </span>
            <span className="block truncate text-muted-foreground leading-5" title={email}>
              {email}
            </span>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="cursor-pointer justify-between"
            disabled={pending}
            onSelect={signOut}
          >
            {pending ? "Logging out…" : "Log out"}
            <LogOutIcon aria-hidden="true" />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function getInitials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts.at(-1)?.[0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.[0] ?? email[0] ?? "?").toUpperCase();
}
