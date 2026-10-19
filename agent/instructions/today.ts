import { defineDynamic, defineInstructions } from "eve/instructions";

// The model needs today's date to resolve "next Tuesday" into a booking date.
export default defineDynamic({
  events: {
    "turn.started": () =>
      defineInstructions({ content: `Today is ${new Date().toISOString().slice(0, 10)}.` }),
  },
});
