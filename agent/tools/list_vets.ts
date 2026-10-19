import { defineTool } from "eve/tools";
import { z } from "zod";
import { petclinic } from "../lib/petclinic.js";

export default defineTool({
  description: "List the clinic's vets and their specialties.",
  inputSchema: z.object({}),
  label: { start: () => "List vets" },
  async execute() {
    return petclinic("/vets");
  },
});
