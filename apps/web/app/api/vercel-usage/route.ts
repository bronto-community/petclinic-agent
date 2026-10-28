import { SeverityNumber } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { STOP_AT } from "@/lib/stop-at";

// Pulls what Vercel's drains don't carry from the REST API, hourly by a Vercel cron job
// (vercel.ts), and forwards it as OpenTelemetry events: Sandbox sessions that ended in the
// last hour, the project's Drives and daemon instances (snapshots), and once a day, after
// the billing day closes at 07:00 UTC, the project's FOCUS cost lines.
// Needs VERCEL_API_TOKEN (a token with read access to the team) and VERCEL_TEAM_ID.
// The exporter reads the standard OTEL_EXPORTER_OTLP_* variables.

export const maxDuration = 60;

const API = "https://api.vercel.com";

const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({ "service.name": "vercel-usage", "service.namespace": "petclinic-agent" }),
  processors: [new BatchLogRecordProcessor({ exporter: new OTLPLogExporter() })],
});
const logger = loggerProvider.getLogger("vercel-usage");

type Attributes = Record<string, string | number | boolean>;

type Session = {
  readonly id: string;
  readonly sourceSandboxName?: string;
  readonly status: string;
  readonly region: string;
  readonly runtime?: string;
  readonly vcpus: number;
  readonly memory: number;
  readonly duration?: number;
  readonly activeCpuDurationMs?: number;
  readonly startedAt?: number;
  readonly stoppedAt?: number;
  readonly networkTransfer?: { readonly ingress: number; readonly egress: number };
};
type Drive = { readonly id: string; readonly name: string; readonly region: string; readonly maxSizeBytes: number; readonly createdAt: number };
type Daemon = {
  readonly name: string;
  readonly deploymentId: string;
  readonly status: string;
  readonly config: { readonly resources?: { readonly requests?: { readonly memory?: string } } };
  readonly instances: { readonly items: readonly { readonly id: string; readonly region: string; readonly startedAt: string; readonly alive: boolean; readonly memoryMiB: number }[] };
};
type Charge = {
  readonly ChargePeriodStart: string;
  readonly ServiceName: string;
  readonly ServiceCategory: string;
  readonly RegionId?: string;
  readonly ConsumedQuantity?: number;
  readonly ConsumedUnit?: string;
  readonly EffectiveCost: number;
  readonly BilledCost: number;
  readonly BillingCurrency: string;
  readonly PricingCategory?: string;
  readonly Tags?: { readonly ProjectId?: string };
};

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (Date.now() >= STOP_AT.getTime()) {
    return Response.json({ stopped: true, stopAt: STOP_AT.toISOString() }, { status: 410 });
  }
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!process.env.VERCEL_API_TOKEN || !process.env.VERCEL_TEAM_ID || !projectId) {
    return Response.json({ error: "VERCEL_API_TOKEN, VERCEL_TEAM_ID and VERCEL_PROJECT_ID are required" }, { status: 503 });
  }

  const now = Date.now();
  const hourAgo = now - 3_600_000;
  const summary = { sessions: 0, drives: 0, daemonInstances: 0, charges: 0 };

  const { sessions } = await vercel<{ sessions: Session[] }>(`/v2/sandboxes/sessions?project=${projectId}&limit=100`);
  for (const s of sessions.filter((s) => s.stoppedAt && s.stoppedAt >= hourAgo && s.stoppedAt < now)) {
    emit("vercel.sandbox.session", s.stoppedAt!, {
      "vercel.sandbox.session.id": s.id,
      "vercel.sandbox.name": s.sourceSandboxName ?? "",
      "vercel.sandbox.status": s.status,
      "vercel.sandbox.runtime": s.runtime ?? "",
      "vercel.sandbox.vcpus": s.vcpus,
      "vercel.sandbox.memory_mb": s.memory,
      "vercel.sandbox.duration_ms": s.duration ?? 0,
      "vercel.sandbox.active_cpu_ms": s.activeCpuDurationMs ?? 0,
      "vercel.sandbox.network.ingress_bytes": s.networkTransfer?.ingress ?? 0,
      "vercel.sandbox.network.egress_bytes": s.networkTransfer?.egress ?? 0,
      "cloud.region": s.region,
    });
    summary.sessions += 1;
  }

  const { drives } = await vercel<{ drives: Drive[] }>(`/v2/sandboxes/drives?projectId=${projectId}`);
  for (const d of drives) {
    emit("vercel.drive", now, {
      "vercel.drive.id": d.id,
      "vercel.drive.name": d.name,
      "vercel.drive.max_size_bytes": d.maxSizeBytes,
      "vercel.drive.created_at": new Date(d.createdAt).toISOString(),
      "cloud.region": d.region,
    });
    summary.drives += 1;
  }

  const { daemons } = await vercel<{ daemons: Daemon[] }>(`/v1/projects/${projectId}/daemons`);
  for (const daemon of daemons) {
    for (const i of daemon.instances.items) {
      emit("vercel.daemon.instance", now, {
        "vercel.daemon.name": daemon.name,
        "vercel.daemon.status": daemon.status,
        "vercel.daemon.instance.id": i.id,
        "vercel.daemon.instance.alive": i.alive,
        "vercel.daemon.instance.started_at": i.startedAt,
        "vercel.daemon.instance.memory_mib": i.memoryMiB,
        "vercel.deployment.id": daemon.deploymentId,
        "cloud.region": i.region,
      });
      summary.daemonInstances += 1;
    }
  }

  // Billing days run 07:00 to 07:00 UTC; the 07:45 run forwards the day that just closed.
  if (new Date(now).getUTCHours() === 7) {
    const to = new Date(now);
    to.setUTCHours(7, 0, 0, 0);
    const from = new Date(to.getTime() - 86_400_000);
    const text = await vercelText(`/v1/billing/charges?from=${from.toISOString()}&to=${to.toISOString()}`);
    for (const line of text.split("\n").filter(Boolean)) {
      const c = JSON.parse(line) as Charge;
      if (c.Tags?.ProjectId !== projectId) continue;
      emit("vercel.billing.charge", Date.parse(c.ChargePeriodStart), {
        "vercel.billing.service_name": c.ServiceName,
        "vercel.billing.service_category": c.ServiceCategory,
        "vercel.billing.consumed_quantity": c.ConsumedQuantity ?? 0,
        "vercel.billing.consumed_unit": c.ConsumedUnit ?? "",
        "vercel.billing.effective_cost": c.EffectiveCost,
        "vercel.billing.billed_cost": c.BilledCost,
        "vercel.billing.currency": c.BillingCurrency,
        "vercel.billing.pricing_category": c.PricingCategory ?? "",
        "cloud.region": c.RegionId ?? "",
      });
      summary.charges += 1;
    }
  }

  await loggerProvider.forceFlush();
  console.log(JSON.stringify({ msg: "vercel usage pulled", ...summary }));
  return Response.json(summary);
}

function emit(eventName: string, timestamp: number, attributes: Attributes) {
  logger.emit({ eventName, timestamp, severityNumber: SeverityNumber.INFO, severityText: "INFO", body: eventName, attributes });
}

async function vercelText(path: string): Promise<string> {
  const separator = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API}${path}${separator}teamId=${process.env.VERCEL_TEAM_ID}`, {
    headers: { authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Vercel API ${path.split("?")[0]} returned ${res.status}`);
  return res.text();
}

async function vercel<T>(path: string): Promise<T> {
  return JSON.parse(await vercelText(path)) as T;
}
