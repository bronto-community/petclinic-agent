import { defineAgent, defineDynamic } from "eve";
import { basicModel } from "./lib/basic-model.js";

// Two plans:
// - Free (anonymous visitors): "PetClinic Basic", a rule-based model that can list
//   vets and look up owners, and never books.
// - Premium (signed-in users, and Vercel OIDC callers such as the synthetic-traffic
//   cron): an AI Gateway model, EVE_MODEL, default Claude Haiku 5.5. If its providers
//   fail, the AI Gateway falls back to EVE_FALLBACK_MODEL, from another provider.
const PREMIUM_MODEL = process.env.EVE_MODEL ?? "anthropic/claude-haiku-5.5";
const FALLBACK_MODEL = process.env.EVE_FALLBACK_MODEL ?? "google/gemini-3.8-flash";

const gateway: Record<string, string[]> = { models: [FALLBACK_MODEL] };
// CHAOS_MODEL_OUTAGE=1 lets only the fallback model's provider serve requests, so the
// premium model is unavailable and every call falls back, as in a provider outage.
if (process.env.CHAOS_MODEL_OUTAGE === "1") gateway.only = [FALLBACK_MODEL.split("/")[0]];

export default defineAgent({
  model: defineDynamic({
    events: {
      // Live LanguageModel objects can only be returned per step.
      "step.started": (_event, ctx) =>
        ctx.session.auth.current?.principalType === "anonymous"
          ? { model: basicModel, modelContextWindowTokens: 32_000 }
          : { model: PREMIUM_MODEL, modelOptions: { providerOptions: { gateway } } },
    },
  }),
  reasoning: "low",
});
