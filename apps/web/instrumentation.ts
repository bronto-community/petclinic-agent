import { OpenTelemetry } from "@ai-sdk/otel";
import { registerOTel } from "@vercel/otel";
import { registerTelemetry } from "ai";

// OpenTelemetry for the Next.js app, the way most Vercel projects set it up.
// propagateContextUrls makes fetch() calls to PetClinic and the AI Gateway carry the
// trace context, so their spans join the trace of the request that called them.
// registerTelemetry turns on the AI SDK's spans (GenAI semantic conventions);
// providerMetadata adds the AI Gateway's cost and routing to each model-call span.
export function register() {
  const petclinic = process.env.PETCLINIC_URL ? new URL(process.env.PETCLINIC_URL).origin : undefined;
  registerOTel({
    serviceName: "petclinic-web",
    attributes: { "service.namespace": "petclinic-agent" },
    instrumentationConfig: {
      fetch: { propagateContextUrls: [...(petclinic ? [petclinic] : []), "https://ai-gateway.vercel.sh"] },
    },
  });
  registerTelemetry(new OpenTelemetry({ providerMetadata: true }));
}
