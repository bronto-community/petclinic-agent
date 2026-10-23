// Runs after `eve build` for the eve service (see vercel.ts).
// eve writes its own Build Output. This sets, in its functions' .vc-config.json:
// - maxDuration 60 s on the HTTP server function: a session stream whose client has
//   gone away otherwise stays open (and billed) for the default 300 s. Turns run in the
//   Workflow function, and eve's clients reconnect a stream from their cursor.
//   (supportsCancellation in .vc-config.json was tried first and had no effect.)
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = process.argv[2];
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
  if (path.includes("__server.func")) config.maxDuration = SERVER_MAX_DURATION;
  await writeFile(path, JSON.stringify(config, null, 2));
  const notes = [path.includes("__server.func") && `maxDuration=${SERVER_MAX_DURATION}`];
  console.log(`patched ${path.slice(root.length)}: ${notes.filter(Boolean).join(", ")}`);
}
