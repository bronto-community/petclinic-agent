import { getVercelOidcToken } from "@vercel/oidc";

// Synthetic traffic for the demo, run every minute by a Vercel cron job (vercel.ts).
// Each run: one agent conversation (1-3 turns), a page load, direct PetClinic calls,
// and now and then a request the firewall blocks.
//
// Hard stop: after STOP_AT every run returns immediately, whatever the configuration.
// The date lives in code on purpose, so no environment variable can extend it.
const STOP_AT = new Date("2026-10-23T22:00:00Z"); // Saturday 24 Oct, 00:00 Europe/Berlin

export const maxDuration = 300;

const USER_AGENT = "petclinic-synthetic/1.0";

// Owners and pets from PetClinic's seed data, plus names that don't exist.
const SCRIPTS: readonly (readonly string[])[] = [
  ["Which vets do surgery?"],
  ["Which vets work at the clinic, and what are their specialties?"],
  ["I'm George Franklin. What pets do I have?", "What visits has Leo had?"],
  ["Hi, this is Betty Davis.", "When was Basil last at the clinic?"],
  ["I'm Jean Coleman. Please book a check-up for Samantha next Monday.", "Yes, please book it."],
  ["Hello, Eduardo Rodriquez here. Rosy needs a vaccination next Friday.", "Correct, go ahead."],
  ["I'm Harold Davis and Iggy has been sneezing. Can I book a visit tomorrow?", "Yes, tomorrow is fine."],
  ["This is Maria Escobito. Book a dental check for Mulligan next Wednesday.", "Yes, that's right."],
  ["I'm Peter McTavish. What visits has George had?"],
  ["Hi, I'm Jane Smith. I'd like to book a visit for my cat.", "My last name is Smith."],
  ["I'm Carlos Estaban, please book a check-up for Lucky next Tuesday.", "Yes.", "Thanks!"],
];

const OWNER_LOOKUPS = ["Davis", "Franklin", "Coleman", "Smith", "Black", "Escobito", "Nobody"];
const SCANNER_PATHS = ["/.env", "/wp-login.php", "/.git/config", "/xmlrpc.php"];

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (Date.now() >= STOP_AT.getTime()) {
    return Response.json({ stopped: true, stopAt: STOP_AT.toISOString() }, { status: 410 });
  }

  const origin = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL ?? new URL(request.url).host}`;
  const script = pick(SCRIPTS);

  const [conversation] = await Promise.allSettled([
    runConversation(origin, script),
    fetch(`${origin}/`, { headers: { "user-agent": USER_AGENT } }),
    petclinicCalls(),
    Math.random() < 0.1
      ? fetch(`${origin}${pick(SCANNER_PATHS)}`, { headers: { "user-agent": "sqlmap/1.8" } })
      : Promise.resolve(),
  ]);

  const result =
    conversation.status === "fulfilled"
      ? { turns: conversation.value }
      : { error: String(conversation.reason) };
  console.log(JSON.stringify({ msg: "synthetic run", script: script[0], ...result }));
  return Response.json(result);
}

/** Runs one conversation against the agent's HTTP API; returns the turns completed. */
async function runConversation(origin: string, messages: readonly string[]): Promise<number> {
  const headers = {
    authorization: `Bearer ${await getVercelOidcToken()}`,
    "content-type": "application/json",
    "user-agent": USER_AGENT,
  };
  const created = await fetch(`${origin}/eve/v1/session`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message: messages[0] }),
  });
  if (!created.ok) throw new Error(`create session: ${created.status}`);
  const { sessionId } = (await created.json()) as { sessionId: string };

  let turns = 0;
  for (const [index, message] of messages.entries()) {
    if (index > 0) {
      const sent = await fetch(`${origin}/eve/v1/session/${sessionId}`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message }),
      });
      if (!sent.ok) throw new Error(`send turn ${index + 1}: ${sent.status}`);
    }
    await waitForTurns(origin, sessionId, headers, index + 1);
    turns = index + 1;
  }
  return turns;
}

/** Reads the session stream until `count` turns have settled. */
async function waitForTurns(origin: string, sessionId: string, headers: Record<string, string>, count: number) {
  const res = await fetch(`${origin}/eve/v1/session/${sessionId}/stream`, {
    headers,
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok || !res.body) throw new Error(`stream: ${res.status}`);
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let settled = 0;
  try {
    while (settled < count) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += value;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const type = line.match(/"type":"(turn\.(?:completed|failed|cancelled))"/)?.[1];
        if (type) settled += 1;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  if (settled < count) throw new Error(`turn ${count} did not settle`);
}

/** A few direct PetClinic API calls, outside the agent. */
async function petclinicCalls() {
  const base = process.env.PETCLINIC_URL;
  if (!base) return;
  const headers = { "x-petclinic-key": process.env.PETCLINIC_API_KEY ?? "", "user-agent": USER_AGENT };
  await fetch(`${base}/owners?lastName=${encodeURIComponent(pick(OWNER_LOOKUPS))}`, { headers });
  await fetch(`${base}/vets`, { headers });
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] as T;
}
