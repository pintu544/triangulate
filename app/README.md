# Triangulate — a multi-model research agent on Otari

**One-liner:** Triangulate asks several different LLMs the same research question — all through Mozilla's Otari gateway — then cross-examines their answers and shows you where the models agree, where they fight, and what each answer cost.

Built for the **Mozilla Otari Hackathon (Devs Wilding Online!, DoraHacks)**. Branch: `otari-hackathon`. The first commit on this branch that brings Otari in is the one adding `src/otari.ts` (the gateway client).

## Why Otari is load-bearing here

Triangulate's whole premise is "one question, many models". Without a gateway, that means N provider SDKs, N keys, N billing quirks. With Otari:

- **One endpoint, one token.** Every call is `POST https://eu.api.otari.ai/api/v1/chat/completions` Bearer-style auth is NOT used — the token goes in an Otari-Key header, and auth uses the auth. Swapping a panellist is changing a `provider/model` string — see `OTARI_MODELS`.
- **Provider keys stay in Otari's vault.** This repo and the browser never see an OpenAI/Mistral key; they hold only a scoped Otari platform token.
- **Usage is accounted twice, consistently.** The gateway returns OpenAI-style `usage` per call; Triangulate aggregates it per model in the report, and the same calls show up in the Otari dashboard under the token — the demo cross-checks the two.
- **Open-weight friendly.** The default panel mixes providers (`openai:gpt-4o-mini`, `mistral:mistral-large-latest`, `openai:gpt-4o`); adding an open-weight model hosted elsewhere is a one-line config change.

### Otari features used (submission item 4)

1. Hosted Otari gateway (otari.ai) as the single AI endpoint for the whole app.
2. Multi-provider routing via `provider/model` model strings.
3. Platform tokens (virtual keys) instead of raw provider keys in the app.
4. Per-call usage reporting (`usage` blocks) aggregated in-app; dashboard-side usage tracking under the same token.
5. Provider-key vaulting on otari.ai (keys added in org settings, never in code).

## Setup

```bash
cd app
npm install
cp .env.example .env   # then fill in OTARI_API_KEY (see below), or leave blank for MOCK MODE
npm run demo -- "Your research question here"   # CLI demo
npm start                                        # web UI on http://localhost:4173
npm test                                         # unit tests (no network)
```

### Getting an Otari token (account owner steps)

1. Sign up at **otari.ai** (the first 200 signups were offered $20 in tokens).
2. Add a provider key at `otari.ai/organization-settings/provider-keys` (e.g. OpenAI, Mistral) so the gateway can route.
3. Create a platform token at `otari.ai/organization-settings/api-tokens`.
4. Put it in `.env` as `OTARI_API_KEY=...` (or export it). Restart — the app detects it and switches from MOCK MODE to OTARI mode. Nothing else changes.

### Mock mode

With no token set, the app runs **MOCK MODE**: a deterministic, clearly-labelled canned panel (banner in the UI, header in the CLI, `mode: "mock"` in every report). It exists so the pipeline, UI, and tests can be demoed offline. It is never presented as real model output.

## How it works

`plan → fan-out → synthesize`, all calls through `src/otari.ts`:

1. A planner call splits the question into 3 sub-questions (evidence state / arguments both sides / what would change the answer).
2. Every model in the panel answers every sub-question independently, in parallel.
3. A synthesizer call cross-examines all answers into a briefing with **Consensus**, **Contested** (attributed by model), **Single-source claims**, and a **Bottom line**. A failed panellist degrades the panel; it never fabricates a replacement answer.

## Demo script (for the 3–5 min video)

- **0:00–0:30** — The problem: one model, one answer, no way to know if it's the outlier. Show the Triangulate UI and the panel config (`OTARI_MODELS`) — three providers, one endpoint.
- **0:30–1:30** — Run a live question. Show the fan-out: 3 sub-questions × 3 models, all through otari.ai. Point at the mode indicator (OTARI, not mock).
- **1:30–2:30** — Walk the briefing: a Consensus point, then a Contested point where two named models disagree, then a Single-source claim flagged as unverified.
- **2:30–3:15** — Show the per-model token table; open the Otari dashboard and show the same calls logged under the platform token. Swap one model in `OTARI_MODELS`, restart, rerun — zero code changes.
- **3:15–4:00** — Honest notes: what the gateway made trivial (provider swap, key hygiene, usage), and the friction points (see feedback draft below).

## Written feedback for Otari (submission item 7 — draft for the owner to approve/edit)

1. **When were you most tempted to skip Otari and call the provider directly?**
   When debugging a failed panellist call: the gateway error surface is thinner than the provider's own error, so the temptation was to reproduce the call directly against the provider to see the raw error. A "last error detail" passthrough (or a request-id lookup in the dashboard) would remove most of that temptation.
2. **What did you end up building yourself that Otari should've done for you?**
   Per-model usage aggregation for a fan-out workload. Otari returns `usage` per call and tracks it dashboard-side, but for "one question, nine calls, three models" reporting we had to sum it ourselves client-side. A gateway-side grouped usage endpoint (by model / by time window, via API) would make cost reporting a read, not an accumulation. *(Note: to be confirmed against the live dashboard once the account is active — there may be an API for this we haven't seen yet.)*
3. **If the rules hadn't required Otari, would you have continued using Otari? Why or why not?**
   Yes for this app shape. The moment a project needs a second provider, the gateway pays for itself: one auth model, keys in one vault, and a usage ledger you don't have to build. For a single-provider toy it would be overhead; for anything multi-model it's the sane default.

## Layout

```
app/
  src/otari.ts    — Otari gateway client (+ labelled mock transport). The only Otari-aware file.
  src/agent.ts    — plan → fan-out → synthesize pipeline, usage aggregation
  src/server.ts   — web server (UI + /api/research + /api/health)
  src/cli.ts      — terminal demo
  public/         — single-file UI
  test/           — node:test suites (fake transport, no network)
```
