import type {
  LanguageModelV4,
  LanguageModelV4CallOptions,
  LanguageModelV4Content,
  LanguageModelV4StreamPart,
  LanguageModelV4Usage,
} from "@ai-sdk/provider";

// "PetClinic Basic": the free plan's model. It is rule-based, not an LLM, and implements
// the AI SDK's LanguageModelV4 interface, so eve runs it like any other model: it makes
// real tool calls (list_vets, find_owner) and answers from their results. It never books.

type Owner = {
  firstName: string;
  lastName: string;
  pets: { name: string; type?: { name: string }; visits: { date: string; description: string }[] }[];
};
type Vet = { firstName: string; lastName: string; specialties: { name: string }[] };

const UPGRADE = "Sign in for Premium to book visits and chat with the AI assistant.";
const HELP =
  "I'm PetClinic Basic. I can list our vets and their specialties, or look up your pets and past visits. " +
  `Try "Which vets do surgery?" or "I'm Betty Davis". ${UPGRADE}`;

const ZERO_USAGE: LanguageModelV4Usage = {
  inputTokens: { total: 0, noCache: 0, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 0, text: 0, reasoning: 0 },
};

type Reply = { kind: "text"; text: string } | { kind: "tool"; toolName: string; input: Record<string, unknown> };

export const basicModel: LanguageModelV4 = {
  specificationVersion: "v4",
  provider: "petclinic",
  modelId: "petclinic-basic-1",
  supportedUrls: {},

  async doGenerate(options) {
    const reply = decide(options);
    const content: LanguageModelV4Content[] =
      reply.kind === "text"
        ? [{ type: "text", text: reply.text }]
        : [{ type: "tool-call", toolCallId: callId(), toolName: reply.toolName, input: JSON.stringify(reply.input) }];
    return {
      content,
      finishReason: { unified: reply.kind === "text" ? "stop" : "tool-calls", raw: undefined },
      usage: ZERO_USAGE,
      warnings: [],
    };
  },

  async doStream(options) {
    const reply = decide(options);
    const parts: LanguageModelV4StreamPart[] = [{ type: "stream-start", warnings: [] }];
    if (reply.kind === "text") {
      parts.push({ type: "text-start", id: "t0" });
      // Word-sized chunks, so the chat streams like a real model.
      for (const word of reply.text.split(/(?<=\s)/)) parts.push({ type: "text-delta", id: "t0", delta: word });
      parts.push({ type: "text-end", id: "t0" });
    } else {
      parts.push({ type: "tool-call", toolCallId: callId(), toolName: reply.toolName, input: JSON.stringify(reply.input) });
    }
    parts.push({
      type: "finish",
      finishReason: { unified: reply.kind === "text" ? "stop" : "tool-calls", raw: undefined },
      usage: ZERO_USAGE,
    });
    return {
      stream: new ReadableStream({
        start(controller) {
          for (const part of parts) controller.enqueue(part);
          controller.close();
        },
      }),
    };
  },
};

function decide({ prompt }: LanguageModelV4CallOptions): Reply {
  const last = prompt.at(-1);

  // After a tool call: answer from its result.
  if (last?.role === "tool") {
    const result = last.content.find((part) => part.type === "tool-result");
    if (!result) return { kind: "text", text: HELP };
    if (result.output.type !== "json") {
      return { kind: "text", text: "Sorry, I couldn't reach the clinic's records just now. Please try again later." };
    }
    const question = lastUserText(prompt);
    if (result.toolName === "list_vets") return { kind: "text", text: describeVets(result.output.value as Vet[], question) };
    if (result.toolName === "find_owner") {
      return { kind: "text", text: describeOwners(result.output.value as Owner[], question) };
    }
    return { kind: "text", text: HELP };
  }

  const question = lastUserText(prompt);
  if (/\b(book|booking|appointment|schedule|reserve)\b/i.test(question)) {
    return { kind: "text", text: `Booking is a Premium feature. ${UPGRADE}` };
  }
  // "I'm Betty Davis", "this is Davis", "my name is Betty Davis" (straight or curly apostrophe).
  const name = question.match(
    /\b(?:[Ii][’']?m|I am|[Tt]his is|[Mm]y name is|[Nn]ame[’']?s)\s+(?:[A-Z][a-z]+\s+)?([A-Z][a-zA-Z’'-]+)/,
  );
  if (name?.[1]) return { kind: "tool", toolName: "find_owner", input: { lastName: name[1] } };
  if (/\b(vets?|veterinarians?|doctors?|surgery|surgeon|dentist|dentistry|radiology|specialt)/i.test(question)) {
    return { kind: "tool", toolName: "list_vets", input: {} };
  }
  return { kind: "text", text: HELP };
}

function describeVets(vets: Vet[], question: string): string {
  const asked = ["surgery", "dentistry", "radiology"].find((s) => question.toLowerCase().includes(s.slice(0, 5)));
  const list = asked ? vets.filter((v) => v.specialties.some((s) => s.name === asked)) : vets;
  if (list.length === 0) return `None of our vets lists ${asked} as a specialty.`;
  const lines = list.map(
    (v) => `- ${v.firstName} ${v.lastName}: ${v.specialties.map((s) => s.name).join(", ") || "general practice"}`,
  );
  return `${asked ? `Vets for ${asked}` : "Our vets"}:\n\n${lines.join("\n")}\n\n${UPGRADE}`;
}

function describeOwners(owners: Owner[], question: string): string {
  if (owners.length === 0) return `I couldn't find an owner with that name in our records. ${UPGRADE}`;
  const first = question.match(/\b(?:[Ii][’']?m|I am|[Tt]his is|[Mm]y name is)\s+([A-Z][a-z]+)\s+[A-Z]/)?.[1];
  const matches = first ? owners.filter((o) => o.firstName === first) : owners;
  const shown = matches.length > 0 ? matches : owners;
  const blocks = shown.map((owner) => {
    const pets = owner.pets.map((pet) => {
      const visits = pet.visits.length
        ? pet.visits.map((v) => `${v.date} (${v.description})`).join(", ")
        : "no visits yet";
      return `- ${pet.name}${pet.type ? `, ${pet.type.name}` : ""}: ${visits}`;
    });
    return `**${owner.firstName} ${owner.lastName}**\n\n${pets.join("\n") || "- no pets on file"}`;
  });
  return `${blocks.join("\n\n")}\n\n${UPGRADE}`;
}

function lastUserText(prompt: LanguageModelV4CallOptions["prompt"]): string {
  for (let i = prompt.length - 1; i >= 0; i--) {
    const message = prompt[i];
    if (message?.role !== "user") continue;
    const text = message.content
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(" ")
      .trim();
    // eve adds context messages (like today's date) as user text; skip those.
    if (text && !/^Today is \d{4}-\d{2}-\d{2}\.$/.test(text)) return text;
  }
  return "";
}

let counter = 0;
function callId(): string {
  counter = (counter + 1) % 1_000_000;
  return `basic_${Date.now().toString(36)}_${counter}`;
}
