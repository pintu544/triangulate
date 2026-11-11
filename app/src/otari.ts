/**
 * Otari gateway client — the ONLY module in this app that knows Otari exists.
 *
 * Otari (Mozilla AI) is an OpenAI-compatible LLM gateway. The hosted platform
 * endpoint used here is https://eu.api.otari.ai/api/v1 and it takes the
 * platform token in an `Otari-Key` header. Model strings are deployment
 * names such as `openai/gpt-oss-120b` — one endpoint, one key, every
 * provider the account has credentials/hosted deployments for. That is the
 * entire integration surface used here. (Contract verified live against the
 * real account on 2026-11-11: chat completions, usage and cost blocks.)
 *
 * If OTARI_API_KEY is not set, the client runs in MOCK MODE: deterministic
 * canned panel responses, clearly labelled everywhere they surface, so the
 * full pipeline can be demoed and tested with zero secrets.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatResult {
  content: string;
  usage: TokenUsage;
  /** True when this response came from the local mock transport, not Otari. */
  mock: boolean;
}

export type ChatFn = (model: string, messages: ChatMessage[]) => Promise<ChatResult>;

export interface OtariClient {
  chat: ChatFn;
  /** "otari" when calling the real gateway, "mock" when no token is set. */
  mode: "otari" | "mock";
  baseUrl: string;
  models: string[];
}

export const DEFAULT_BASE_URL = "https://eu.api.otari.ai/api/v1";

/**
 * Panellists verified live on the project account (2026-11-11). A model only
 * works if the Otari account has a hosted deployment or a configured provider
 * credential for it — others return 424, so this list is deliberately the
 * verified set, not a wishlist. Override with OTARI_MODELS.
 */
export const DEFAULT_MODELS = [
  "openai/gpt-oss-120b",
  "mistral/mistral-large-latest",
  "mistral/mistral-medium-latest",
];

export function parseModels(env: NodeJS.ProcessEnv): string[] {
  const raw = env.OTARI_MODELS?.trim();
  if (!raw) return [...DEFAULT_MODELS];
  const models = raw.split(",").map((m) => m.trim()).filter(Boolean);
  return models.length > 0 ? models : [...DEFAULT_MODELS];
}

/** Real transport: one HTTPS POST to the Otari gateway per chat call. */
function realChat(baseUrl: string, token: string): ChatFn {
  return async (model, messages) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300_000);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "Otari-Key": token,
        },
        body: JSON.stringify({ model, messages }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Otari gateway ${res.status} for model ${model}: ${body.slice(0, 300)}`);
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content ?? "";
      const usage: TokenUsage = {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        totalTokens:
          data.usage?.total_tokens ??
          (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0),
      };
      return { content, usage, mock: false };
    } finally {
      clearTimeout(timeout);
    }
  };
}

/* ------------------------------------------------------------------ */
/* Mock transport — deterministic, labelled, offline.                  */
/* ------------------------------------------------------------------ */

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const STANCES = [
  {
    name: "evidence-first",
    text: (q: string) =>
      `On "${q}", the strongest reading of the available evidence is cautiously positive. ` +
      `The primary sources point the same way, adoption metrics have moved steadily for several quarters, ` +
      `and the main counter-examples come from early, unrepresentative samples. Confidence: moderate-high. ` +
      `What would change this view: two consecutive quarters of reversal in the headline metric.`,
  },
  {
    name: "skeptical",
    text: (q: string) =>
      `On "${q}", I am skeptical of the consensus framing. The headline claims rest on vendor-reported numbers ` +
      `and survivorship-biased case studies; independent replications are thinner than the coverage suggests. ` +
      `Confidence: low-moderate. What would change this view: a pre-registered independent study with public data.`,
  },
  {
    name: "contrarian",
    text: (q: string) =>
      `On "${q}", the under-discussed angle is second-order effects: incentives shift once a practice becomes ` +
      `the default, and the costs show up in maintenance and lock-in rather than in the launch metrics everyone quotes. ` +
      `Confidence: moderate. What would change this view: long-horizon total-cost data from teams that adopted early.`,
  },
];

function mockChat(): ChatFn {
  return async (model, messages) => {
    const system = messages.find((m) => m.role === "system")?.content ?? "";
    const user = messages[messages.length - 1]?.content ?? "";
    let content: string;

    if (system.includes("PLANNER")) {
      const q = user.replace(/^Question:\s*/i, "").trim();
      content = JSON.stringify([
        `What is the current state of the evidence on: ${q}`,
        `What are the strongest arguments for and against: ${q}`,
        `What evidence would change the answer to: ${q}`,
      ]);
    } else if (system.includes("SYNTHESIZER")) {
      content =
        `## Consensus\nAll panellists agree the question is empirical and that headline claims outrun the ` +
        `independent evidence base.\n\n## Contested\nThe panel splits on how much weight to give vendor-reported ` +
        `metrics: the evidence-first view accepts them with caveats, the skeptical view discounts them heavily, ` +
        `and the contrarian view redirects attention to second-order costs.\n\n## Single-source claims\nOnly the ` +
        `contrarian panellist raised long-horizon lock-in costs; no other model mentioned them.\n\n## Bottom line\n` +
        `Treat the mainstream claim as plausible but unproven; the discriminating evidence is named in the panel answers above.`;
    } else {
      const stance = STANCES[hashString(model) % STANCES.length];
      content = `[mock panellist: ${model}, stance: ${stance.name}] ` + stance.text(user);
    }

    const usage: TokenUsage = {
      promptTokens: 120 + (hashString(user) % 80),
      completionTokens: 90 + (hashString(model + user) % 60),
      totalTokens: 0,
    };
    usage.totalTokens = usage.promptTokens + usage.completionTokens;
    return { content, usage, mock: true };
  };
}

export function createOtariClient(env: NodeJS.ProcessEnv = process.env): OtariClient {
  const baseUrl = (env.OTARI_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  const models = parseModels(env);
  const token = (env.OTARI_API_KEY ?? env.OTARI_AI_TOKEN)?.trim();
  if (token) {
    return { chat: realChat(baseUrl, token), mode: "otari", baseUrl, models };
  }
  return { chat: mockChat(), mode: "mock", baseUrl, models };
}
