import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createOtariClient } from "./otari.js";
import { runResearch } from "./agent.js";

const client = createOtariClient();
const here = dirname(fileURLToPath(import.meta.url));
const indexPath = join(here, "../../public/index.html");

function json(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) {
      const html = await readFile(indexPath, "utf8");
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }
    if (req.method === "GET" && req.url === "/api/health") {
      json(res, 200, { ok: true, mode: client.mode, baseUrl: client.baseUrl, models: client.models });
      return;
    }
    if (req.method === "POST" && req.url === "/api/research") {
      let raw = "";
      for await (const chunk of req) raw += chunk;
      const { question } = JSON.parse(raw || "{}") as { question?: string };
      if (!question || typeof question !== "string" || question.trim().length < 8) {
        json(res, 400, { error: "Please provide a research question (at least 8 characters)." });
        return;
      }
      const report = await runResearch(client.chat, client.mode, question.trim(), client.models);
      json(res, 200, report);
      return;
    }
    json(res, 404, { error: "Not found" });
  } catch (err) {
    json(res, 500, { error: err instanceof Error ? err.message : String(err) });
  }
});

const port = Number(process.env.PORT ?? 4173);
server.listen(port, () => {
  console.log(`Triangulate running at http://localhost:${port}`);
  console.log(
    client.mode === "mock"
      ? "MODE: MOCK (no OTARI_API_KEY set — canned panel answers, clearly labelled)"
      : `MODE: OTARI (gateway ${client.baseUrl}, panel: ${client.models.join(", ")})`,
  );
});
