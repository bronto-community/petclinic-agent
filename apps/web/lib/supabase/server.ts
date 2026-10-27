import "@supabase/supabase-js/tracing";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase on the server, as the visitor: the session comes from the request's cookies,
// so row-level security applies. tracePropagation makes each request to Supabase carry
// the active span's trace context, so Supabase's API gateway logs share the trace ID of
// the Next.js request that made them.
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      tracePropagation: true,
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        },
      },
    },
  );
}
