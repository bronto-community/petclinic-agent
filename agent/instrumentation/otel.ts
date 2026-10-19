import { otel } from "eve/instrumentation/otel";

// Service name and namespace match PetClinic's, so both sides group together in the backend.
export default otel({
  resource: {
    "service.name": "petclinic-agent",
    "service.namespace": "petclinic-agent",
    "deployment.environment.name": process.env.VERCEL_ENV ?? "local",
  },
});
