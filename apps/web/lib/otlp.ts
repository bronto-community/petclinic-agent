// Standard OpenTelemetry exporter settings, read from OTEL_EXPORTER_OTLP_* variables.
export function otlpEndpoint(signal: "logs" | "traces"): string | undefined {
  const specific = process.env[`OTEL_EXPORTER_OTLP_${signal.toUpperCase()}_ENDPOINT`];
  if (specific) return specific;
  const base = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  return base ? `${base.replace(/\/$/, "")}/v1/${signal}` : undefined;
}

// OTEL_EXPORTER_OTLP_HEADERS format: "key1=value1,key2=value2", values URL-encoded.
export function otlpHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const pair of (process.env.OTEL_EXPORTER_OTLP_HEADERS ?? "").split(",")) {
    const index = pair.indexOf("=");
    if (index <= 0) continue;
    headers[decodeURIComponent(pair.slice(0, index).trim())] = decodeURIComponent(pair.slice(index + 1).trim());
  }
  return headers;
}
