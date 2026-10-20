// Runs after `eve build` for the eve service (see vercel.ts).
// eve writes its own Build Output, so per-service `functions` settings in vercel.ts
// don't reach its functions. This sets them in each function's .vc-config.json:
// - regions: run next to PetClinic (eu-west-1) instead of the default iad1
// - supportsCancellation on the HTTP server function, so a stream whose client has
//   disconnected ends instead of running until maxDuration. Turns run in the
//   Workflow function, which keeps running.
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2];
const REGIONS = ["dub1"];

async function* configs(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* configs(path);
    else if (entry.name === ".vc-config.json") yield path;
  }
}

for await (const path of configs(join(root, "functions"))) {
  const config = JSON.parse(await readFile(path, "utf8"));
  config.regions = REGIONS;
  if (path.includes("__server.func")) config.supportsCancellation = true;
  await writeFile(path, JSON.stringify(config, null, 2));
  console.log(`patched ${path.slice(root.length)}: regions=${REGIONS}${config.supportsCancellation ? ", supportsCancellation" : ""}`);
}
