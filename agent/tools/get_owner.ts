import { defineTool } from "eve/tools";
import { z } from "zod";
import { petclinic } from "../lib/petclinic.js";

export default defineTool({
  description: "Get one owner by ID, with their pets and each pet's visits.",
  inputSchema: z.object({ ownerId: z.number().int().positive() }),
  label: { start: ({ ownerId }) => `Load owner ${ownerId}` },
  async execute({ ownerId }) {
    return petclinic(`/owners/${ownerId}`);
  },
});
