import { defineAgent } from "eve";

export default defineAgent({
  // Any AI Gateway model ID; override with EVE_MODEL without a code change.
  model: process.env.EVE_MODEL ?? "anthropic/claude-sonnet-5.5",
  reasoning: "low",
});
