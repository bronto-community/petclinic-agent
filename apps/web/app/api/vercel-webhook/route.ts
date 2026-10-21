import { createHmac, timingSafeEqual } from "node:crypto";
import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { after } from "next/server";

// Receives Vercel deployment webhooks and forwards each event as an OpenTelemetry event
// (a log record with an event name), so deploys show up as markers next to the app's
// traces and logs. The exporter reads the standard OTEL_EXPORTER_OTLP_* variables.
// vcs.* attributes follow the OpenTelemetry semantic conventions; fields the conventions
// don't define use the vercel.* namespace.
// Webhooks: https://vercel.com/docs/webhooks (signature: HMAC-SHA1 of the body, hex).

const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({ "service.name": "vercel-deployments", "service.namespace": "petclinic-agent" }),
  processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
});
const logger = loggerProvider.getLogger("vercel-webhook");

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
  if (!event.type.startsWith("deployment.")) return Response.json({ ignored: true });

  logger.emit(toLogRecord(event));
  after(() => loggerProvider.forceFlush()); // export before the function ends
  return Response.json({ ok: true });
}

function validSignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(createHmac("sha1", secret).update(body).digest("hex"));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function toLogRecord(event: DeploymentEvent) {
  const deployment = event.payload?.deployment;
  const meta = deployment?.meta ?? {};
  const repository =
    meta.githubOrg && meta.githubRepo ? `https://github.com/${meta.githubOrg}/${meta.githubRepo}` : undefined;
  const attributes: Record<string, string | undefined> = {
    "vercel.event.id": event.id,
    "vercel.project.id": event.payload?.project?.id,
    "vercel.project.name": deployment?.name,
    "vercel.deployment.id": deployment?.id,
    "vercel.deployment.url": deployment?.url,
    "vercel.target": event.payload?.target ?? undefined,
    "vcs.provider.name": repository ? "github" : undefined,
    "vcs.owner.name": meta.githubOrg,
    "vcs.repository.name": meta.githubRepo,
    "vcs.repository.url.full": repository,
    "vcs.ref.head.name": meta.githubCommitRef,
    "vcs.ref.head.type": meta.githubCommitRef ? "branch" : undefined,
    "vcs.ref.head.revision": meta.githubCommitSha,
    "vercel.git.commit.message": meta.githubCommitMessage,
    "vercel.git.commit.author": meta.githubCommitAuthorLogin,
  };
  const failed = event.type === "deployment.error";
  return {
    eventName: event.type,
    timestamp: event.createdAt,
    severityNumber: failed ? SeverityNumber.ERROR : SeverityNumber.INFO,
    severityText: failed ? "ERROR" : "INFO",
    body: [event.type, deployment?.name, event.payload?.target, deployment?.url].filter(Boolean).join(" "),
    attributes: Object.fromEntries(Object.entries(attributes).filter(([, value]) => value)),
  };
}
