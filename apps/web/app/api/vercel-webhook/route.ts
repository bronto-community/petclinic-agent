import { createHmac, timingSafeEqual } from "node:crypto";
import { otlpEndpoint, otlpHeaders } from "@/lib/otlp";

// Receives Vercel deployment webhooks and forwards each event as an OTLP log record,
// so deploys show up as markers next to the app's traces and logs.
// Webhooks: https://vercel.com/docs/webhooks (signature: HMAC-SHA1 of the body, hex).

type DeploymentEvent = {
  readonly id: string;
  readonly type: string;
  readonly createdAt: number;
  readonly payload?: {
    readonly target?: string | null;
    readonly project?: { readonly id?: string };
    readonly deployment?: {
      readonly id?: string;
      readonly name?: string;
      readonly url?: string;
      readonly meta?: Record<string, string | undefined>;
    };
  };
};

export async function POST(request: Request) {
  const secret = process.env.VERCEL_WEBHOOK_SECRET;
  const body = await request.text();
  if (!secret || !validSignature(body, request.headers.get("x-vercel-signature"), secret)) {
    return Response.json({ error: "invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body) as DeploymentEvent;
  const endpoint = otlpEndpoint("logs");
  if (!event.type.startsWith("deployment.") || !endpoint) return Response.json({ ignored: true });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { ...otlpHeaders(), "content-type": "application/json" },
    body: JSON.stringify(toOtlpLog(event)),
  });
  if (!res.ok) {
    console.error(JSON.stringify({ msg: "deployment event export failed", status: res.status }));
    return Response.json({ error: "export failed" }, { status: 502 });
  }
  return Response.json({ ok: true });
}

function validSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(createHmac("sha1", secret).update(body).digest("hex"));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function toOtlpLog(event: DeploymentEvent) {
  const deployment = event.payload?.deployment;
  const meta = deployment?.meta ?? {};
  const attributes: Record<string, string | undefined> = {
    "event.name": event.type,
    "vercel.event.id": event.id,
    "vercel.project.id": event.payload?.project?.id,
    "vercel.project.name": deployment?.name,
    "vercel.deployment.id": deployment?.id,
    "vercel.deployment.url": deployment?.url,
    "vercel.target": event.payload?.target ?? undefined,
    "vcs.ref.head.name": meta.githubCommitRef,
    "vcs.ref.head.revision": meta.githubCommitSha,
    "vcs.commit.message": meta.githubCommitMessage,
    "vcs.commit.author": meta.githubCommitAuthorLogin,
  };
  const failed = event.type === "deployment.error";
  return {
    resourceLogs: [
      {
        resource: {
          attributes: [
            { key: "service.name", value: { stringValue: "vercel-deployments" } },
            { key: "service.namespace", value: { stringValue: "petclinic-agent" } },
          ],
        },
        scopeLogs: [
          {
            scope: { name: "vercel-webhook" },
            logRecords: [
              {
                timeUnixNano: String(event.createdAt * 1_000_000),
                severityNumber: failed ? 17 : 9,
                severityText: failed ? "ERROR" : "INFO",
                body: {
                  stringValue: [event.type, deployment?.name, event.payload?.target, deployment?.url].filter(Boolean).join(" "),
                },
                attributes: Object.entries(attributes)
                  .filter((entry): entry is [string, string] => Boolean(entry[1]))
                  .map(([key, value]) => ({ key, value: { stringValue: value } })),
              },
            ],
          },
        ],
      },
    ],
  };
}
