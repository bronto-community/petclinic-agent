import { defineTool } from "eve/tools";
import { z } from "zod";
import { PetClinicError, petclinic } from "../lib/petclinic.js";

export default defineTool({
  description: "Find pet owners by last name. Returns each owner with their pets and past visits.",
  inputSchema: z.object({ lastName: z.string().min(1) }),
  label: { start: ({ lastName }) => `Look up owners named ${lastName}` },
  async execute({ lastName }) {
    try {
      return await petclinic(`/owners?lastName=${encodeURIComponent(lastName)}`);
    } catch (error) {
      // PetClinic answers 404 when no owner matches; for the agent that's an empty result.
      if (error instanceof PetClinicError && error.status === 404) return [];
      throw error;
    }
  },
});
