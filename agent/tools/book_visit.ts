import { defineTool } from "eve/tools";
import { z } from "zod";
import { petclinic } from "../lib/petclinic.js";
import { visitNote } from "../lib/visit-note.js";

export default defineTool({
  description: "Book a visit for a pet. Use the owner and pet IDs from find_owner or get_owner.",
  inputSchema: z.object({
    ownerId: z.number().int().positive(),
    petId: z.number().int().positive(),
    petName: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
    description: z.string().min(1).max(255),
  }),
  label: { start: ({ date }) => `Book a visit on ${date}` },
  async execute({ ownerId, petId, petName, date, description }) {
    const visit = await petclinic(`/owners/${ownerId}/pets/${petId}/visits`, {
      method: "POST",
      body: { date, description },
    });
    // The booking stands even if the note fails; the agent then confirms without it.
    const note = await visitNote({ petName, date, description }).catch((error: unknown) => {
      console.error(JSON.stringify({ msg: "visit note failed", error: String(error) }));
      return undefined;
    });
    return { visit, note };
  },
});
