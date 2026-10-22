import { getVercelOidcToken } from "@vercel/oidc";

// The clinic's note service in the Next.js app (apps/web/app/api/visit-note): a short
// confirmation and what to bring. Plain fetch(); the undici instrumentation adds the
// client span and traceparent, so the note's AI SDK spans join the agent's trace.
const WEB_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : (process.env.WEB_URL ?? "http://localhost:3000");

export type VisitNote = { confirmation: string; bring: string[] };

export async function visitNote(visit: { petName: string; date: string; description: string }): Promise<VisitNote> {
  const res = await fetch(`${WEB_URL}/api/visit-note`, {
    method: "POST",
    headers: { authorization: `Bearer ${await getVercelOidcToken()}`, "content-type": "application/json" },
    body: JSON.stringify(visit),
  });
  if (!res.ok) throw new Error(`visit note returned ${res.status}`);
  return (await res.json()) as VisitNote;
}
