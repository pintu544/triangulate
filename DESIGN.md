# DESIGN — Triangulate

## Architecture

```
                ┌────────────────────────────────────────────┐
  Browser / CLI │  app (TypeScript, Node, zero runtime deps) │
 ─────────────► │                                            │
                │  server.ts ──► agent.ts ──► otari.ts       │
                │  (HTTP UI +    (plan →      (chat client)  │
                │   /api/research) fan-out →        │        │
                │                  synthesize)      │        │
                └───────────────────────────────────┼────────┘
                                                    │ HTTPS, OpenAI-compatible
                                                    ▼
                                    Otari hosted gateway
                                    https://api.otari.ai/v1
                                    (auth: Bearer platform token,
                                     budgets + usage tracked there)
                                                    │
                          ┌───────────────┬─────────┴────────┐
                          ▼               ▼                  ▼
                    provider:model   provider:model    provider:model
                    (panel member 1) (panel member 2)  (panel member 3)
```

## Modules

- **`src/otari.ts`** — the only file that knows Otari exists.
  - `createOtariClient(env)` → `{ chat(model, messages), mode }`.
  - Real mode: `POST {OTARI_BASE_URL ?? https://api.otari.ai/v1}/chat/completions` with `Authorization: Bearer $OTARI_AI_TOKEN`, body `{ model, messages }`; parses the OpenAI-compatible response incl. `usage`.
  - Mock mode (no token): deterministic canned responder keyed by model + prompt role (planner / panellist / synthesizer). Every mock response is stamped `mock: true` and the UI/CLI display "MOCK MODE" prominently. Mock usage numbers are fabricated-but-labelled as such.
  - This file is the "first commit where Otari came in" for the submission (see TASKS.md commit plan).
- **`src/agent.ts`** — pure pipeline over an injected `ChatFn`:
  - `planQuestion(q)` → 3 sub-questions (JSON-parsed, with a safe fallback to `[q]`).
  - `runPanel(subQuestions, models)` → parallel calls; failures per (model, sub-question) are captured, not fatal.
  - `synthesize(q, panel)` → briefing markdown with Consensus / Contested / Single-source sections.
  - `runResearch(q, models)` → `ResearchReport { question, subQuestions, answers[], briefing, usageByModel, totals, mode }`.
- **`src/server.ts`** — `node:http` server: `GET /` serves `public/index.html`; `POST /api/research {question}` → report JSON; `GET /api/health` → `{ ok, mode, models }` (never exposes the token).
- **`src/cli.ts`** — terminal demo: prints sub-questions, per-model usage table, and the briefing.
- **`public/index.html`** — single-file UI: question box, panel/usage table, briefing render (plain text→HTML escaping, no framework).

## Otari features used (submission item 4)

1. **Hosted gateway as the single AI endpoint** (otari.ai) — all model traffic goes through it.
2. **Multi-provider routing via `provider:model` strings** — 3 providers behind one key/endpoint.
3. **Open-weight model access** — the default panel includes a provider known for open-weight hosting (Mistral) alongside OpenAI; panel is env-configurable (`OTARI_MODELS`).
4. **Usage tracking** — response `usage` blocks aggregated per model in-app; the same calls are visible in Otari's dashboard under the platform token (verifiable in the demo).
5. **Virtual-key / budget model** — the app needs only a scoped platform token; provider keys live in Otari's vault, never in this repo or the client. (Budget enforcement itself is configured on otari.ai by the account owner.)

Stretch (needs live token to verify): Otari server-side **web search** tool for the panellists.

## Config (env)

| Var | Meaning | Default |
|---|---|---|
| `OTARI_AI_TOKEN` | otari.ai platform token (Bearer) | unset → MOCK MODE |
| `OTARI_BASE_URL` | gateway base URL | `https://api.otari.ai/v1` |
| `OTARI_MODELS` | comma-separated `provider:model` panel | `openai:gpt-4o-mini,mistral:mistral-large-latest,openai:gpt-4o` |
| `PORT` | web UI port | `4173` |

## Failure behaviour

- A panellist call failing (provider down, bad model id) degrades the panel; the synthesis prompt is told which cells are missing, and the report marks them `error` instead of inventing content.
- No token → mock mode, loudly labelled everywhere (UI banner, CLI header, `report.mode`).
