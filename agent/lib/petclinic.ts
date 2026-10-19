import { context, propagation, SpanKind, SpanStatusCode, trace } from "@opentelemetry/api";

// Client for the PetClinic REST API running outside Vercel.
// Each call is an HTTP client span (stable HTTP semantic conventions) and carries
// its W3C trace context (traceparent), so PetClinic's spans join the agent's trace
// in any backend that receives both sides.
const BASE_URL = process.env.PETCLINIC_URL ?? "http://localhost:8088/petclinic/api";
const API_KEY = process.env.PETCLINIC_API_KEY ?? "local-dev-key";
const tracer = trace.getTracer("petclinic-agent/petclinic-client");

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
  const method = init.method ?? "GET";
  const url = new URL(`${BASE_URL}${path}`);

  return tracer.startActiveSpan(
    method,
    {
      kind: SpanKind.CLIENT,
      attributes: {
        "http.request.method": method,
        "url.full": url.href,
        "server.address": url.hostname,
        "server.port": Number(url.port) || (url.protocol === "https:" ? 443 : 80),
      },
    },
    async (span) => {
      const headers: Record<string, string> = {
        accept: "application/json",
        "x-petclinic-key": API_KEY,
      };
      propagation.inject(context.active(), headers);
      if (init.body !== undefined) headers["content-type"] = "application/json";

      try {
        const res = await fetch(url, {
          method,
          headers,
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
        });
        span.setAttribute("http.response.status_code", res.status);
        const text = await res.text();
        console.log(
          JSON.stringify({ msg: "petclinic call", method, path, status: res.status, traceparent: headers.traceparent ?? null }),
        );
        if (!res.ok) {
          // Client spans treat 4xx and 5xx as errors.
          span.setAttribute("error.type", String(res.status));
          span.setStatus({ code: SpanStatusCode.ERROR });
          throw new PetClinicError(res.status, text);
        }
        return (text ? JSON.parse(text) : undefined) as T;
      } catch (error) {
        if (!(error instanceof PetClinicError)) {
          span.setAttribute("error.type", error instanceof Error ? error.name : "_OTHER");
          span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
        }
        throw error;
      } finally {
        span.end();
      }
    },
  );
}
