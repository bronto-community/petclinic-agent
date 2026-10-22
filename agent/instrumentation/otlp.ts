import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { disableInstrumentation } from "eve/instrumentation";
import { otelIntegration } from "eve/instrumentation/otel";

// Sends the agent's traces to any OTLP/HTTP backend. The exporter reads the standard
// OTEL_EXPORTER_OTLP_* variables (endpoint, headers). Without an endpoint, nothing is exported.
const configured = process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

// runtimeContext stamps each model call with the plan and the caller, as
// ai.settings.context.* attributes, so token usage and cost can be grouped by them.
export default configured
  ? otelIntegration({
      traceExporter: new OTLPTraceExporter(),
      runtimeContext: ({ session }) => {
        const user = session.auth.current;
        return {
          plan: user?.principalType === "anonymous" ? "free" : "premium",
          "user.type": user?.principalType ?? "none",
          "user.id": user?.principalId ?? "",
        };
      },
    })
  : disableInstrumentation();
