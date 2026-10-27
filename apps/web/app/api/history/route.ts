import { createSupabaseServerClient } from "@/lib/supabase/server";

// The visitor's saved conversations, in Supabase's chat_sessions table. Row-level
// security limits every query to the visitor's own rows (owner = auth.uid()).
const MAX_ENTRIES = 50;

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims) return Response.json([]);
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false })
    .limit(MAX_ENTRIES);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json(
    data.map((row) => ({ id: row.id, title: row.title, updatedAt: Date.parse(row.updated_at) })),
  );
}

/** Adds the session, or moves it to the top and keeps its title. */
export async function POST(request: Request) {
  const { id, title } = (await request.json()) as { id?: string; title?: string };
  if (!id || !title) return Response.json({ error: "id and title are required" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: readError } = await supabase
    .from("chat_sessions")
    .select("title")
    .eq("id", id)
    .maybeSingle();
  if (readError) return Response.json({ error: readError.message }, { status: 500 });
  const { error } = await supabase
    .from("chat_sessions")
    .upsert({ id, title: existing?.title ?? title, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return Response.json({ error: "id is required" }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("chat_sessions").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return new Response(null, { status: 204 });
}
