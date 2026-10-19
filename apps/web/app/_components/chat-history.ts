"use client";

import { useCallback, useEffect, useState } from "react";

// eve has no API to list a user's sessions, but every session reopens at /s/<id>.
// So the history is a per-user list in this browser's localStorage.
export type ChatHistoryEntry = {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
};

const MAX_ENTRIES = 50;

function read(key: string): ChatHistoryEntry[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ChatHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

function write(key: string, entries: ChatHistoryEntry[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    window.dispatchEvent(new StorageEvent("storage", { key }));
  } catch {
    // Storage blocked or full: history is a convenience, the chat still works.
  }
}

export function useChatHistory(userKey: string) {
  const key = `petclinic:chat-history:${userKey}`;
  const [entries, setEntries] = useState<ChatHistoryEntry[]>([]);

  useEffect(() => {
    const sync = () => setEntries(read(key));
    sync();
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === key) sync();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [key]);

  /** Adds the session, or moves it to the top and keeps its title. */
  const record = useCallback(
    (id: string, title: string) => {
      const current = read(key);
      const existing = current.find((entry) => entry.id === id);
      const next = [
        { id, title: existing?.title ?? title, updatedAt: Date.now() },
        ...current.filter((entry) => entry.id !== id),
      ];
      write(key, next);
    },
    [key],
  );

  const remove = useCallback(
    (id: string) => write(key, read(key).filter((entry) => entry.id !== id)),
    [key],
  );

  return { entries, record, remove };
}
