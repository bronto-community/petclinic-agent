import { withEve } from "eve/vercel";

const config = await withEve({
  // Synthetic traffic every minute and the ops agent every hour; both routes stop
  // themselves after the hard-coded STOP_AT (apps/web/lib/stop-at.ts).
  crons: [
    { path: "/api/synthetic", schedule: "* * * * *" },
    { path: "/api/ops", schedule: "0 * * * *" },
  ],
  services: {
    web: {
      framework: "nextjs",
      root: "apps/web",
      buildCommand: "node ../../node_modules/next/dist/bin/next build",
    },
  },
  routes: [
    { src: "^(.*)$", destination: { type: "service", service: "web" } },
  ],
});

// FUNCTION_REGION (a build environment variable, e.g. "dub1") runs every function next
// to where PetClinic is hosted. Unset, Vercel's default region applies.
const region = process.env.FUNCTION_REGION;
if (region) (config as { regions?: string[] }).regions = [region];
const services = config.services as Record<string, Record<string, unknown>>;
// eve writes its own Build Output; patch its function configs (the server function's
// maxDuration).
const eve = services.eve as { buildCommand: string };
eve.buildCommand += " && node scripts/patch-eve-vercel-output.mjs .eve/vercel-services/eve/.vercel/output";

export default config;
