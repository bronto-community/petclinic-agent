import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { disableInstrumentation } from "eve/instrumentation";
import { otelIntegration } from "eve/instrumentation/otel";

// Sends the agent's traces to any OTLP/HTTP backend. The exporter reads the standard
// OTEL_EXPORTER_OTLP_* variables (endpoint, headers). Without an endpoint, nothing is exported.
const configured = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

export default configured ? otelIntegration({ traceExporter: new OTLPTraceExporter() }) : disableInstrumentation();
