import { OTLPHttpProtoTraceExporter } from "@vercel/otel";
import { disableInstrumentation } from "eve/instrumentation";
import { otelIntegration } from "eve/instrumentation/otel";

// Sends the agent's traces to any OTLP/HTTP backend, configured with the
// standard OpenTelemetry environment variables. Without an endpoint, nothing is exported.
const endpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ??
  (process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, "")}/v1/traces`
    : undefined);

export default endpoint
  ? otelIntegration({
      traceExporter: new OTLPHttpProtoTraceExporter({
        url: endpoint,
        headers: parseHeaders(
          process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS ?? process.env.OTEL_EXPORTER_OTLP_HEADERS,
        ),
      }),
    })
  : disableInstrumentation();

// OTEL_EXPORTER_OTLP_HEADERS format: "key1=value1,key2=value2", values URL-encoded.
function parseHeaders(raw: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const pair of (raw ?? "").split(",")) {
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    headers[decodeURIComponent(pair.slice(0, index).trim())] = decodeURIComponent(pair.slice(index + 1).trim());
  }
  return headers;
}
