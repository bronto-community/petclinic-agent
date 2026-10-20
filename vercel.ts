import { withEve } from "eve/vercel";

const config = await withEve({
  // Synthetic traffic every minute; the route stops itself after its hard-coded STOP_AT.
  crons: [{ path: "/api/synthetic", schedule: "* * * * *" }],
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

// Run every function in Dublin, next to PetClinic on Lightsail in eu-west-1.
// With services, a top-level `regions` key doesn't reach the functions: it has to be
// set per service, in that service's `functions` configuration.
const services = config.services as Record<string, Record<string, unknown>>;
for (const service of Object.values(services)) {
  service.functions = { ...(service.functions as object | undefined), "**/*": { regions: ["dub1"] } };
}

export default config;
