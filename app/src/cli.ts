import { createOtariClient } from "./otari.js";
import { runResearch } from "./agent.js";

const question =
  process.argv.slice(2).join(" ").trim() ||
  "Do open-weight LLMs actually save teams money versus frontier APIs once you count maintenance?";

const client = createOtariClient();
console.log("=".repeat(72));
console.log("TRIANGULATE — multi-model research agent");
console.log(
  client.mode === "mock"
    ? "MODE: MOCK — no OTARI_AI_TOKEN set. All answers below are canned and labelled."
    : `MODE: OTARI — gateway ${client.baseUrl}`,
);
console.log(`Panel: ${client.models.join(" | ")}`);
console.log("=".repeat(72));
console.log(`\nQuestion: ${question}\n`);

const report = await runResearch(client.chat, client.mode, question, client.models);

console.log("Sub-questions:");
report.subQuestions.forEach((sq, i) => console.log(`  ${i + 1}. ${sq}`));

console.log("\nToken usage by model (as reported by the gateway):");
for (const [model, u] of Object.entries(report.usageByModel)) {
  console.log(`  ${model.padEnd(34)} prompt ${u.promptTokens}  completion ${u.completionTokens}  total ${u.totalTokens}`);
}
console.log(`  ${"TOTAL".padEnd(34)} prompt ${report.totals.promptTokens}  completion ${report.totals.completionTokens}  total ${report.totals.totalTokens}`);

console.log("\n--- BRIEFING ----------------------------------------------------\n");
console.log(report.briefing);
