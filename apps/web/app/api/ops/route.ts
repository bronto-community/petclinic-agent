import { opsAgent } from "@/lib/ops-agent";
import { STOP_AT } from "@/lib/stop-at";

// Hourly cron (vercel.ts): starts one session of the ops agent for the next day. The turn
// runs in durable-harness's queue route (withDurableHarness in next.config.ts), not here.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (Date.now() >= STOP_AT.getTime()) {
    return Response.json({ stopped: true, stopAt: STOP_AT.toISOString() }, { status: 410 });
  }

  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const { sessionId } = await opsAgent.sessions.start();
  // CHAOS_OPS_CRASH=1: arm a crash 50 ms into the turn's first tool call. The function
  // running the turn dies there, and another one resumes the turn from the session's log.
  if (process.env.CHAOS_OPS_CRASH === "1") await opsAgent.sessions.chaos(sessionId, { at: "tool", afterMs: 50 });
  await opsAgent.sessions.send(sessionId, `Post the schedule for ${tomorrow}.`);
  return Response.json({ sessionId });
}
