"use client";

import { HistoryIcon, MessageSquareIcon, PlusIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { AppMark, RepoLink } from "./brand";
import type { ChatHistoryEntry } from "./chat-history";

type HistoryProps = {
  readonly activeId?: string;
  readonly entries: readonly ChatHistoryEntry[];
  readonly onRemove: (id: string) => void;
};

function HistoryList({ activeId, entries, onRemove }: HistoryProps) {
  if (entries.length === 0) {
    return <p className="px-3 py-2 text-muted-foreground text-sm">Your chats will appear here.</p>;
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {entries.map((entry) => (
        <li className="group/item relative" key={entry.id}>
          <a
            aria-current={entry.id === activeId ? "page" : undefined}
            className={cn(
              "flex items-start gap-2.5 rounded-lg py-2 pr-8 pl-3 text-sm transition-colors hover:bg-accent",
              entry.id === activeId && "bg-chip text-foreground",
            )}
            href={`/s/${encodeURIComponent(entry.id)}`}
          >
            <MessageSquareIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2">{entry.title}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                {formatWhen(entry.updatedAt)}
              </span>
            </span>
          </a>
          <button
            aria-label={`Remove "${entry.title}" from history`}
            className="absolute top-2 right-1.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-background hover:text-foreground focus-visible:opacity-100 group-hover/item:opacity-100"
            onClick={() => onRemove(entry.id)}
            type="button"
          >
            <XIcon className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

function NewChatButton() {
  return (
    <Button className="w-full justify-start gap-2" onClick={() => window.location.assign("/s")} type="button" variant="outline">
      <PlusIcon className="size-4" />
      New chat
    </Button>
  );
}

/** Left sidebar on large screens. */
export function HistorySidebar(props: HistoryProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-border border-r bg-card/70 backdrop-blur lg:flex">
      <div className="flex h-14 items-center justify-end px-4">
        <AppMark size="sm" />
      </div>
      <div className="px-3 pb-3">
        <NewChatButton />
      </div>
      <p className="px-6 pb-1 font-mono text-[11px] text-muted-foreground uppercase tracking-wider">History</p>
      <nav aria-label="Chat history" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        <HistoryList {...props} />
      </nav>
      <div className="border-border border-t px-6 py-3">
        <RepoLink />
      </div>
    </aside>
  );
}

/** History button and dialog on small screens. */
export function MobileHistory(props: HistoryProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button aria-label="Chat history" className="pointer-events-auto fixed top-3 left-14 z-30 lg:hidden" size="icon-sm" type="button" variant="ghost">
          <HistoryIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Your chats</DialogTitle>
          <DialogDescription>Saved in this browser.</DialogDescription>
        </DialogHeader>
        <NewChatButton />
        <HistoryList {...props} />
        <RepoLink className="mt-2" />
      </DialogContent>
    </Dialog>
  );
}

function formatWhen(timestamp: number): string {
  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(timestamp).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
