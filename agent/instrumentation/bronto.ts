import { OTLPHttpProtoTraceExporter } from "@vercel/otel";
import { disableInstrumentation } from "eve/instrumentation";
import { otelIntegration } from "eve/instrumentation/otel";

// Sends the agent's traces straight to Bronto over OTLP, next to PetClinic's.
const region = process.env.BRONTO_REGION ?? "eu";
const apiKey = process.env.BRONTO_API_KEY;

export default apiKey
  ? otelIntegration({
      traceExporter: new OTLPHttpProtoTraceExporter({
        url: `https://ingestion.${region}.bronto.io/v1/traces`,
        headers: { "x-bronto-api-key": apiKey },
      }),
    })
  : disableInstrumentation();
