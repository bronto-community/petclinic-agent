import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { SimpleSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { agentRuns } from "durable-harness/instrumentation/otel";

// Vercel Agent Runs for the ops agent's sessions (lib/ops-agent.ts), on durable-harness's
// own tracer provider. spanProcessors sends the same spans to the OTLP backend too; the
// exporter reads the standard OTEL_EXPORTER_OTLP_* variables. SimpleSpanProcessor exports
// each span as it ends, so a crash drill (CHAOS_OPS_CRASH) loses no buffered spans.
const configured = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

export default agentRuns({
  serviceName: "petclinic-ops",
  spanProcessors: configured ? [new SimpleSpanProcessor(new OTLPTraceExporter())] : [],
});
