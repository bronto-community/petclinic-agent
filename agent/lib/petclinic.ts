// Client for the PetClinic REST API running outside Vercel. Plain fetch(): the undici
// instrumentation (agent/instrumentation/otel.ts) records each call as an HTTP client span
// and adds the W3C trace context, so PetClinic's spans join the agent's trace.
const BASE_URL = process.env.PETCLINIC_URL ?? "http://localhost:8088/petclinic/api";
const API_KEY = process.env.PETCLINIC_API_KEY ?? "local-dev-key";

export class PetClinicError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`PetClinic returned ${status}: ${body.slice(0, 300)}`);
    this.name = "PetClinicError";
  }
}

export async function petclinic<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers: {
      accept: "application/json",
      "x-petclinic-key": API_KEY,
      ...(init.body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) throw new PetClinicError(res.status, text);
  return (text ? JSON.parse(text) : undefined) as T;
}
