import { test } from "node:test";
import assert from "node:assert/strict";
import { runResearch, parseSubQuestions } from "../src/agent.js";
import { createOtariClient, parseModels } from "../src/otari.js";
import type { ChatFn } from "../src/otari.js";

const MODELS = ["openai:gpt-4o-mini", "mistral:mistral-large-latest", "openai:gpt-4o"];

test("parseSubQuestions extracts a JSON array and caps at 3", () => {
  const out = parseSubQuestions('noise ["a","b","c","d"] trailing', "fallback");
  assert.deepEqual(out, ["a", "b", "c"]);
});

test("parseSubQuestions falls back to the raw question on garbage", () => {
  assert.deepEqual(parseSubQuestions("not json at all", "the question"), ["the question"]);
});

test("pipeline fans out: planner + models×subquestions + synthesizer calls", async () => {
  let calls = 0;
  const chat: ChatFn = async (_model, messages) => {
    calls++;
    const system = messages[0].content;
    const content = system.includes("PLANNER")
      ? JSON.stringify(["s1", "s2", "s3"])
      : system.includes("SYNTHESIZER")
        ? "## Consensus\nok"
        : "an answer";
    return { content, usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }, mock: false };
  };
  const report = await runResearch(chat, "otari", "a question?", MODELS);
  assert.equal(calls, 1 + MODELS.length * 3 + 1);
  assert.equal(report.answers.length, MODELS.length * 3);
  assert.equal(report.subQuestions.length, 3);
  // totals = every call × 15 tokens
  assert.equal(report.totals.totalTokens, calls * 15);
  // lead model carries planner + its panel cells + synthesizer
  assert.equal(report.usageByModel[MODELS[0]].totalTokens, (1 + 3 + 1) * 15);
});

test("a failing panellist degrades gracefully instead of failing the run", async () => {
  const chat: ChatFn = async (model, messages) => {
    const system = messages[0].content;
    if (system.includes("PLANNER")) return { content: '["s1"]', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, mock: false };
    if (system.includes("SYNTHESIZER")) return { content: "briefing", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, mock: false };
    if (model === MODELS[1]) throw new Error("provider exploded");
    return { content: "fine", usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 }, mock: false };
  };
  const report = await runResearch(chat, "otari", "q?", MODELS);
  const bad = report.answers.find((a) => a.model === MODELS[1]);
  assert.equal(bad?.content, null);
  assert.match(bad?.error ?? "", /provider exploded/);
  assert.equal(report.briefing, "briefing");
});

test("mock mode is labelled and deterministic", async () => {
  const client = createOtariClient({});
  assert.equal(client.mode, "mock");
  const a = await client.chat(MODELS[0], [
    { role: "system", content: "You are one PANELLIST" },
    { role: "user", content: "sub-question?" },
  ]);
  const b = await client.chat(MODELS[0], [
    { role: "system", content: "You are one PANELLIST" },
    { role: "user", content: "sub-question?" },
  ]);
  assert.equal(a.mock, true);
  assert.equal(a.content, b.content);
  assert.match(a.content, /\[mock panellist:/);
});

test("a set token selects real Otari mode; env panel parsing works", () => {
  const client = createOtariClient({ OTARI_AI_TOKEN: "tk_test", OTARI_MODELS: "a:b, c:d" });
  assert.equal(client.mode, "otari");
  assert.deepEqual(client.models, ["a:b", "c:d"]);
  assert.deepEqual(parseModels({}), [
    "openai:gpt-4o-mini",
    "mistral:mistral-large-latest",
    "openai:gpt-4o",
  ]);
});
