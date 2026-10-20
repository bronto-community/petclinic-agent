import { registerOTel } from "@vercel/otel";

// OpenTelemetry for the Next.js app, the way most Vercel projects set it up.
// propagateContextUrls makes fetch() calls to PetClinic carry the trace context,
// so PetClinic's spans join the trace of the page that called it.
export function register() {
  const petclinic = process.env.PETCLINIC_URL ? new URL(process.env.PETCLINIC_URL).origin : undefined;
  registerOTel({
    serviceName: "petclinic-web",
    attributes: { "service.namespace": "petclinic-agent" },
    instrumentationConfig: {
      fetch: { propagateContextUrls: petclinic ? [petclinic] : [] },
    },
  });
}
