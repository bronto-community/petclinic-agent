import type { HostTool } from "durable-harness";
import { pi } from "durable-harness/pi";

// The clinic's back-office agent: once an hour (cron, app/api/ops) it reads the next
// day's visits from PetClinic and posts a schedule for the front desk. It runs Pi's
// agent loop on durable-harness, so each model and tool call is a step in the session's
// log on a Workflow World, and a crash resumes the turn from the log in another function.
// CHAOS_OPS_CRASH=1 turns on the harness's crash drills (see app/api/ops).

type Owner = {
  firstName: string;
  lastName: string;
  pets: { name: string; type?: { name: string }; visits: { date: string; description: string }[] }[];
};

async function petclinic<T>(path: string): Promise<T> {
  const res = await fetch(`${process.env.PETCLINIC_URL}${path}`, {
    headers: { "x-petclinic-key": process.env.PETCLINIC_API_KEY ?? "" },
  });
  if (!res.ok) throw new Error(`PetClinic ${path} returned ${res.status}`);
  return (await res.json()) as T;
}

const visitsOn: HostTool<{ date: string }> = {
  name: "visits_on",
  description: "Lists the visits booked for one day (YYYY-MM-DD), with owner, pet and reason.",
  replay: "safe", // a read: safe to run again after a crash
  inputSchema: { type: "object", properties: { date: { type: "string" } }, required: ["date"] },
  execute: async ({ date }) => {
    const owners = await petclinic<Owner[]>("/owners");
    const visits = owners.flatMap((o) =>
      o.pets.flatMap((p) =>
        p.visits
          .filter((v) => v.date === date)
          .map((v) => ({ owner: `${o.firstName} ${o.lastName}`, pet: p.name, type: p.type?.name, reason: v.description })),
      ),
    );
    return JSON.stringify(visits);
  },
};

const postSchedule: HostTool<{ date: string; schedule: string }> = {
  name: "post_schedule",
  description: "Posts the day's schedule to the front desk. Call it once.",
  replay: "never", // not safe to repeat: after a crash it comes back to the model as interrupted
  inputSchema: {
    type: "object",
    properties: { date: { type: "string" }, schedule: { type: "string" } },
    required: ["date", "schedule"],
  },
  execute: async ({ date, schedule }) => {
    console.log(JSON.stringify({ msg: "ops schedule posted", date, schedule }));
    return "posted";
  },
};

export const opsAgent = pi({
  name: "clinic-ops",
  model: process.env.OPS_MODEL ?? "anthropic/claude-haiku-5.5",
  instructions:
    "You prepare the next day's schedule for a small veterinary clinic. Look up the day's visits with visits_on, then post a short schedule with post_schedule: one line per visit, grouped by reason, and a note if a reason sounds urgent. If there are no visits, post that the day is free.",
  tools: [visitsOn, postSchedule],
  // PetClinic's sample data, so the traces may record the model and tool content.
  traceAudience: "public",
  chaos: process.env.CHAOS_OPS_CRASH === "1",
});
