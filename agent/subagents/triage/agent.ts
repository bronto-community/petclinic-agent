import { defineAgent, defineDynamic } from "eve";
import { PREMIUM_MODEL, premiumModelOptions } from "../../lib/models.js";

// A specialist with its own instructions and no tools, on the Premium plan only.
// eve runs it as a child session, so its turn shows up as its own invoke_agent span.
export default defineDynamic({
  events: {
    "session.started": (_event, ctx) =>
      ctx.session.auth.current?.principalType === "anonymous"
        ? null
        : defineAgent({
            description:
              "Triage a pet's symptoms before booking: how urgent a visit is and a short booking reason. Send the species, the pet's age if known, and the symptoms in the owner's words.",
            model: PREMIUM_MODEL,
            modelOptions: premiumModelOptions,
            reasoning: "low",
          }),
  },
});
