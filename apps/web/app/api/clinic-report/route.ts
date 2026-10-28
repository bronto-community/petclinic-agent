import { Drive, Sandbox } from "@vercel/sandbox";
import { STOP_AT } from "@/lib/stop-at";

// The clinic's report workspace, run hourly by a Vercel cron job (vercel.ts). A Sandbox
// mounts the clinic's Drive, appends the bookings for the next seven days to the day's
// report file and counts the reports kept so far. The Sandbox is gone after each run;
// the Drive keeps the files for later runs.

export const maxDuration = 120;

// A drive lives in one region, and a sandbox that mounts it must run there.
const DRIVE_NAME = "clinic-reports";
const REGION = "iad1";

type Owner = {
  readonly lastName: string;
  readonly pets: readonly { readonly name: string; readonly visits: readonly { readonly date: string; readonly description: string }[] }[];
};

// Runs inside the Sandbox: appends one section to /data/reports/<day>.md, prints a summary.
const REPORT_SCRIPT = `
const fs = require("node:fs");
const { day, hour, visits } = JSON.parse(fs.readFileSync("/tmp/visits.json", "utf8"));
fs.mkdirSync("/data/reports", { recursive: true });
const lines = visits.map((v) => "- " + v.date + " " + v.pet + " (" + v.owner + "): " + v.description);
fs.appendFileSync("/data/reports/" + day + ".md", "## " + hour + " UTC, " + visits.length + " visits in the next 7 days\\n" + lines.join("\\n") + "\\n\\n");
const reports = fs.readdirSync("/data/reports");
const bytes = reports.reduce((sum, f) => sum + fs.statSync("/data/reports/" + f).size, 0);
console.log(JSON.stringify({ reports: reports.length, bytes }));
`;

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (Date.now() >= STOP_AT.getTime()) {
    return Response.json({ stopped: true, stopAt: STOP_AT.toISOString() }, { status: 410 });
  }

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const until = new Date(now.getTime() + 7 * 86_400_000).toISOString().slice(0, 10);
  const res = await fetch(`${process.env.PETCLINIC_URL}/owners`, {
    headers: { "x-petclinic-key": process.env.PETCLINIC_API_KEY ?? "" },
  });
  if (!res.ok) throw new Error(`PetClinic /owners returned ${res.status}`);
  const owners = (await res.json()) as Owner[];
  const visits = owners
    .flatMap((o) => o.pets.flatMap((p) => p.visits.map((v) => ({ ...v, pet: p.name, owner: o.lastName }))))
    .filter((v) => v.date >= day && v.date <= until)
    .sort((a, b) => a.date.localeCompare(b.date));

  const drive = await Drive.getOrCreate({ name: DRIVE_NAME, region: REGION, maxSize: 1024 ** 3 });
  const sandbox = await Sandbox.create({
    region: REGION,
    resources: { vcpus: 1 },
    timeout: 60_000,
    persistent: false,
    mounts: { "/data": drive },
  });
  try {
    await sandbox.writeFiles([
      { path: "/tmp/visits.json", content: JSON.stringify({ day, hour: now.toISOString().slice(11, 16), visits }) },
      { path: "/tmp/report.js", content: REPORT_SCRIPT },
    ]);
    const run = await sandbox.runCommand("node", ["/tmp/report.js"]);
    if (run.exitCode !== 0) throw new Error(`report script exited ${run.exitCode}: ${(await run.stderr()).slice(0, 300)}`);
    const kept = JSON.parse(await run.stdout()) as { reports: number; bytes: number };
    const result = {
      msg: "clinic report written",
      drive: drive.name,
      driveId: drive.driveId,
      sandbox: sandbox.name,
      session: sandbox.currentSession().sessionId,
      visits: visits.length,
      reportsOnDrive: kept.reports,
      bytesOnDrive: kept.bytes,
    };
    console.log(JSON.stringify(result));
    return Response.json(result);
  } finally {
    await sandbox.stop();
  }
}
