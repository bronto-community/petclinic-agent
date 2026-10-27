"use client";

import { createBrowserClient } from "@supabase/ssr";

// Supabase in the browser, only for the visitor's session (stored in cookies, so the
// server routes see it too). Data requests go through /api/history, where they're traced.
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

/** Signs the visitor in anonymously the first time a chat is saved. */
export async function ensureSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
