import { context, propagation } from "@opentelemetry/api";

// Client for the PetClinic REST API running outside Vercel.
// Every call carries the current W3C trace context (traceparent), so PetClinic's
// spans join the agent's trace in any backend that receives both sides.
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
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-petclinic-key": API_KEY,
  };
  propagation.inject(context.active(), headers);
  if (init.body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  console.log(
    JSON.stringify({
      msg: "petclinic call",
      method: init.method ?? "GET",
      path,
      status: res.status,
      traceparent: headers.traceparent ?? null,
    }),
  );
  if (!res.ok) throw new PetClinicError(res.status, text);
  return (text ? JSON.parse(text) : undefined) as T;
}
