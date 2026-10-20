import { withEve } from "eve/vercel";

export default await withEve({
  // Next to PetClinic on Lightsail in eu-west-1.
  regions: ["dub1"],
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
