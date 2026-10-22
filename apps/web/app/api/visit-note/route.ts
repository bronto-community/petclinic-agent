import { verifyVercelOidcToken } from "@vercel/oidc";
import { generateText, Output } from "ai";
import { z } from "zod";

// Writes the note a pet owner gets after booking a visit: a short confirmation and what
// to bring. Called by the agent's book_visit tool, authenticated with the deployment's
// OIDC token. The AI SDK spans come from registerTelemetry in instrumentation.ts.
const MODEL = process.env.VISIT_NOTE_MODEL ?? "anthropic/claude-haiku-5.5";

const Visit = z.object({
  petName: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(255),
});

const Note = z.object({
  confirmation: z.string().describe("One or two friendly sentences confirming the visit"),
  bring: z.array(z.string()).max(5).describe("Short items the owner should bring or prepare"),
});

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  try {
    if (!token) throw new Error("missing token");
    await verifyVercelOidcToken(token);
  } catch {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const visit = Visit.safeParse(await request.json().catch(() => null));
  if (!visit.success) return Response.json({ error: "invalid visit" }, { status: 400 });

  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema: Note }),
    instructions: "You write short, warm notes for a veterinary clinic. No medical advice beyond what to bring.",
    prompt: `Visit for ${visit.data.petName} on ${visit.data.date}. Reason: ${visit.data.description}`,
    telemetry: { functionId: "visit-note" },
  });
  return Response.json(output);
}
