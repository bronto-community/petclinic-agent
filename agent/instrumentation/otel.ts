import { UndiciInstrumentation } from "@opentelemetry/instrumentation-undici";
import { otel } from "eve/instrumentation/otel";

// Service name and namespace match PetClinic's, so both sides group together in the backend.
// The undici instrumentation traces every fetch() the tools make and adds the W3C trace
// context (traceparent), so PetClinic's spans join the agent's trace.
export default otel({
  resource: {
    "service.name": "petclinic-agent",
    "service.namespace": "petclinic-agent",
    "deployment.environment.name": process.env.VERCEL_ENV ?? "local",
  },
  instrumentations: [new UndiciInstrumentation()],
});
