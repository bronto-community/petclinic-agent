import { defineTool } from "eve/tools";
import { z } from "zod";
import { petclinic } from "../lib/petclinic.js";

export default defineTool({
  description: "Find pet owners by last name. Returns each owner with their pets and past visits.",
  inputSchema: z.object({ lastName: z.string().min(1) }),
  label: { start: ({ lastName }) => `Look up owners named ${lastName}` },
  async execute({ lastName }) {
    return petclinic(`/owners?lastName=${encodeURIComponent(lastName)}`);
  },
});
