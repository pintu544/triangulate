/**
 * Triangulate pipeline: plan → fan-out → synthesize.
 *
 * Every model call goes through the injected ChatFn, which in production is
 * the Otari gateway client (src/otari.ts). This module contains no provider
 * code at all — swap the panel by changing model strings, nothing else.
 */

import type { ChatFn, ChatResult, TokenUsage } from "./otari.js";

export interface PanelAnswer {
  model: string;
  subQuestion: string;
  content: string | null;
  error: string | null;
  usage: TokenUsage;
}

export interface ResearchReport {
  question: string;
  subQuestions: string[];
  answers: PanelAnswer[];
  briefing: string;
  usageByModel: Record<string, TokenUsage>;
  totals: TokenUsage;
  /** "otari" for real gateway calls, "mock" for the labelled offline mode. */
  mode: "otari" | "mock";
  models: string[];
}

const PLANNER_SYSTEM = `You are the PLANNER in a multi-model research panel. Break the user's question into exactly 3 focused sub-questions that together cover it: (1) current state of the evidence, (2) strongest arguments on each side, (3) what evidence would change the answer. Respond with ONLY a JSON array of 3 strings, no other text.`;

const PANELLIST_SYSTEM = `You are one PANELLIST in a multi-model research panel. Other models are answering the same sub-question independently; you cannot see their answers. Answer directly in 120-180 words. Take a clear position, name the kind of evidence you are relying on, and end with "Confidence: low|moderate|high" plus one sentence on what evidence would change your mind.`;

const SYNTHESIZER_SYSTEM = `You are the SYNTHESIZER in a multi-model research panel. You are given one research question, its sub-questions, and every panellist's independent answer (or an error marker where a model failed). Write a briefing in markdown with exactly these sections: "## Consensus" (claims most models support), "## Contested" (where models disagree — present each side fairly and attribute it by model name), "## Single-source claims" (claims only one model made — flag them as unverified), "## Bottom line" (2-3 sentences). Never invent claims that no panellist made. If a panellist errored, note the gap in one line under Contested.`;

const ZERO: TokenUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

function addUsage(into: TokenUsage, u: TokenUsage): void {
  into.promptTokens += u.promptTokens;
  into.completionTokens += u.completionTokens;
  into.totalTokens += u.totalTokens;
}

/** Parse the planner's JSON array; fall back to the raw question on any failure. */
export function parseSubQuestions(content: string, fallback: string): string[] {
  try {
    const start = content.indexOf("[");
    const end = content.lastIndexOf("]");
    if (start >= 0 && end > start) {
      const parsed: unknown = JSON.parse(content.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        const qs = parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
        if (qs.length > 0) return qs.slice(0, 3);
      }
    }
  } catch {
    /* fall through to fallback */
  }
  return [fallback];
}

export async function runResearch(
  chat: ChatFn,
  mode: "otari" | "mock",
  question: string,
  models: string[],
): Promise<ResearchReport> {
  if (models.length === 0) throw new Error("At least one model is required.");
  const usageByModel: Record<string, TokenUsage> = {};
  const bump = (model: string, u: TokenUsage) => {
    usageByModel[model] ??= { ...ZERO };
    addUsage(usageByModel[model], u);
  };
  const lead = models[0];

  // 1. Plan (a failed planner call falls back to the raw question rather
  //    than losing the whole run — the panel still answers it directly.)
  let subQuestions: string[];
  try {
    const plan = await chat(lead, [
      { role: "system", content: PLANNER_SYSTEM },
      { role: "user", content: `Question: ${question}` },
    ]);
    bump(lead, plan.usage);
    subQuestions = parseSubQuestions(plan.content, question);
  } catch {
    subQuestions = [question];
  }

  // 2. Fan out: every model answers every sub-question, in parallel, all
  //    through the same gateway client.
  const jobs: Promise<PanelAnswer>[] = [];
  for (const subQuestion of subQuestions) {
    for (const model of models) {
      jobs.push(
        chat(model, [
          { role: "system", content: PANELLIST_SYSTEM },
          { role: "user", content: subQuestion },
        ]).then(
          (r) => {
            bump(model, r.usage);
            return { model, subQuestion, content: r.content, error: null, usage: r.usage } as PanelAnswer;
          },
          (err: unknown) => ({
            model,
            subQuestion,
            content: null,
            error: err instanceof Error ? err.message : String(err),
            usage: { ...ZERO },
          }) as PanelAnswer,
        ),
      );
    }
  }
  const answers = await Promise.all(jobs);

  // 3. Synthesize
  const panelText = subQuestions
    .map((sq) => {
      const cells = answers
        .filter((a) => a.subQuestion === sq)
        .map((a) => (a.error ? `### ${a.model}\n[ERROR: ${a.error}]` : `### ${a.model}\n${a.content}`))
        .join("\n\n");
      return `## Sub-question: ${sq}\n\n${cells}`;
    })
    .join("\n\n");
  let synth: ChatResult;
  try {
    synth = await chat(lead, [
      { role: "system", content: SYNTHESIZER_SYSTEM },
      { role: "user", content: `Research question: ${question}\n\n${panelText}` },
    ]);
  } catch {
    // Degraded briefing: the raw panel, labelled as unsynthesized.
    synth = {
      content:
        `## Consensus\nSynthesis call failed; panellist answers are reproduced unsynthesized below.\n\n## Contested\nSee the raw panel.\n\n## Single-source claims\nSee the raw panel.\n\n## Bottom line\n${panelText}`,
      usage: { ...ZERO },
      mock: mode === "mock",
    };
  }
  bump(lead, synth.usage);

  const totals: TokenUsage = { ...ZERO };
  for (const u of Object.values(usageByModel)) addUsage(totals, u);

  return { question, subQuestions, answers, briefing: synth.content, usageByModel, totals, mode, models };
}
