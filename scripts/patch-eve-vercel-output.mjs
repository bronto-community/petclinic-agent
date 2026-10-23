// Runs after `eve build` for the eve service (see vercel.ts).
// eve writes its own Build Output, so per-service `functions` settings in vercel.ts
// don't reach its functions. This sets them in each function's .vc-config.json:
// - regions: FUNCTION_REGION (e.g. "dub1"), to run next to PetClinic; unset = Vercel's default
// - maxDuration 60 s on the HTTP server function: a session stream whose client has
//   gone away otherwise stays open (and billed) for the default 300 s. Turns run in the
//   Workflow function, and eve's clients reconnect a stream from their cursor.
//   (supportsCancellation in .vc-config.json was tried first and had no effect.)
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2];
const REGIONS = process.env.FUNCTION_REGION ? [process.env.FUNCTION_REGION] : undefined;
const SERVER_MAX_DURATION = 60;

async function* configs(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* configs(path);
    else if (entry.name === ".vc-config.json") yield path;
  }
}

for await (const path of configs(join(root, "functions"))) {
  const config = JSON.parse(await readFile(path, "utf8"));
  if (REGIONS) config.regions = REGIONS;
  if (path.includes("__server.func")) config.maxDuration = SERVER_MAX_DURATION;
  await writeFile(path, JSON.stringify(config, null, 2));
  const notes = [REGIONS && `regions=${REGIONS}`, path.includes("__server.func") && `maxDuration=${SERVER_MAX_DURATION}`];
  console.log(`patched ${path.slice(root.length)}: ${notes.filter(Boolean).join(", ")}`);
}
