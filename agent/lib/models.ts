// The Premium plan's AI Gateway model, EVE_MODEL, default Claude Haiku 5.5. If its
// providers fail, the AI Gateway falls back to EVE_FALLBACK_MODEL, from another provider.
export const PREMIUM_MODEL = process.env.EVE_MODEL ?? "anthropic/claude-haiku-5.5";
const FALLBACK_MODEL = process.env.EVE_FALLBACK_MODEL ?? "google/gemini-3.8-flash";

const gateway: Record<string, string[]> = { models: [FALLBACK_MODEL] };
// CHAOS_MODEL_OUTAGE=1 lets only the fallback model's provider serve requests, so the
// premium model is unavailable and every call falls back, as in a provider outage.
if (process.env.CHAOS_MODEL_OUTAGE === "1") gateway.only = [FALLBACK_MODEL.split("/")[0]];

export const premiumModelOptions = { providerOptions: { gateway } };
