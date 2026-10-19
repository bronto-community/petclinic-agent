"use client";

import { PawPrintIcon } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type ChatUser = {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly image?: string | null;
};

const base = "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full";

export function AssistantAvatar() {
  return (
    <span aria-hidden="true" className={cn(base, "bg-brand text-[#2C2E25] shadow-xs")}>
      <PawPrintIcon className="size-4" />
    </span>
  );
}

export function UserAvatar({ user }: { readonly user?: ChatUser }) {
  const [failed, setFailed] = useState(false);
  if (user?.image && !failed) {
    return (
      // biome-ignore lint/performance/noImgElement: external avatar URL
      <img
        alt=""
        className={cn(base, "border border-border object-cover")}
        onError={() => setFailed(true)}
        src={user.image}
      />
    );
  }
  const initial = (user?.name || user?.email || "You").trim().charAt(0).toUpperCase();
  return (
    <span aria-hidden="true" className={cn(base, "bg-primary font-semibold text-primary-foreground text-xs")}>
      {initial}
    </span>
  );
}
