import { defineAgent, defineDynamic } from "eve";
import { basicModel } from "./lib/basic-model.js";
import { PREMIUM_MODEL, premiumModelOptions } from "./lib/models.js";

// Two plans:
// - Free (anonymous visitors): "PetClinic Basic", a rule-based model that can list
//   vets and look up owners, and never books.
// - Premium (signed-in users, and Vercel OIDC callers such as the synthetic-traffic
//   cron): an AI Gateway model with a fallback (lib/models.ts), and the triage subagent.
export default defineAgent({
  model: defineDynamic({
    events: {
      // Live LanguageModel objects can only be returned per step.
      "step.started": (_event, ctx) =>
        ctx.session.auth.current?.principalType === "anonymous"
          ? { model: basicModel, modelContextWindowTokens: 32_000 }
          : { model: PREMIUM_MODEL, modelOptions: premiumModelOptions },
    },
  }),
  reasoning: "low",
});
