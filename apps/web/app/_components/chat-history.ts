"use client";

import { useCallback, useEffect, useState } from "react";
import { ensureSession } from "@/lib/supabase/client";

// eve has no API to list a user's sessions, but every session reopens at /s/<id>.
// So the history is a list per visitor in Supabase (/api/history), saved under an
// anonymous Supabase session that starts with the first saved chat.
export type ChatHistoryEntry = {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
};

async function load(): Promise<ChatHistoryEntry[]> {
  try {
    const response = await fetch("/api/history", { cache: "no-store" });
    return response.ok ? ((await response.json()) as ChatHistoryEntry[]) : [];
  } catch {
    // History is a convenience: the chat still works without it.
    return [];
  }
}

export function useChatHistory() {
  const [entries, setEntries] = useState<ChatHistoryEntry[]>([]);
  const refresh = useCallback(() => load().then(setEntries), []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Adds the session, or moves it to the top and keeps its title. */
  const record = useCallback(
    (id: string, title: string) => {
      void ensureSession()
        .then(() =>
          fetch("/api/history", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ id, title }),
          }),
        )
        .then(refresh)
        .catch(() => undefined);
    },
    [refresh],
  );

  const remove = useCallback(
    (id: string) => {
      setEntries((current) => current.filter((entry) => entry.id !== id));
      void fetch(`/api/history?id=${encodeURIComponent(id)}`, { method: "DELETE" })
        .then(refresh)
        .catch(() => undefined);
    },
    [refresh],
  );

  return { entries, record, remove };
}
