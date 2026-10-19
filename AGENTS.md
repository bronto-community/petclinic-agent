# petclinic-agent: agent/contributor guide

This project uses the **eve framework**. Before writing agent code, read the relevant guide in `node_modules/eve/docs/` (fallback: https://eve.dev/docs).

- `agent/`: eve agent deployed to Vercel. Tools call PetClinic only through `agent/lib/petclinic.ts`, which adds the `traceparent` and `X-PetClinic-Key` headers.
- `petclinic/`: the upstream PetClinic REST image, unmodified, plus the OpenTelemetry Java agent. Keep it unmodified.
- Secrets live only in `.env`, `.env.local`, `petclinic/.env` and Vercel environment variables. Never commit them.
- Keep the demo small: demo-scale traffic, no production hardening beyond what the articles need.
