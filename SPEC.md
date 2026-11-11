# SPEC — Triangulate: a multi-model research agent on Otari

## One-liner (for the submission form)

Triangulate asks several different LLMs the same research question — all through Mozilla's Otari gateway — then cross-examines their answers and shows you where the models agree, where they fight, and what each answer cost.

## Why this concept

- The owner's DoraHacks registration (6 Nov) used an idea-stage sentence based on his research-agent work; a research agent stays consistent with that registration.
- It makes Otari *load-bearing*, not decorative: the entire point of the product is "one gateway, many providers". Swapping/adding a model is a config string, not new code — exactly the Otari pitch.
- It demos well in 3–5 minutes: one question in, a visible fan-out to multiple models, a briefing with an agreement/dissent map and a per-model token/cost table out.

## What it does

Given a research question, Triangulate:

1. **Plans** — one gateway call turns the question into 3 focused sub-questions.
2. **Fans out** — every sub-question is answered by every configured model, in parallel, all through the single Otari endpoint. Default panel: 3 models from different providers (incl. an open-weight-friendly provider), configurable by env.
3. **Cross-examines** — one synthesis call compares all answers and produces a briefing that separates **consensus** (most models agree), **contested** (models disagree — both sides quoted), and **single-source** claims (only one model said it).
4. **Accounts** — every call's token usage (from Otari's OpenAI-compatible `usage` blocks) is aggregated per model and shown in the report, mirroring what Otari's own dashboard tracks.

## Demo proves

- The same code calls 3 different providers' models with zero provider-specific code — only the `provider:model` string changes (Otari gateway doing its job).
- The report visibly surfaces model disagreement instead of hiding it behind one averaged answer.
- Per-model token accounting works end-to-end (and matches the usage the Otari dashboard records for the same token — checkable in the demo).
- With no token configured, the app runs in a clearly-labelled **MOCK MODE** with deterministic canned panel answers, so the full pipeline is demoable offline.

## Scope

In scope:
- TypeScript/Node app, zero runtime dependencies (Node 20+ `fetch`).
- Otari client (hosted `https://api.otari.ai/v1` default, `OTARI_BASE_URL` override for a self-hosted gateway), Bearer platform token from `OTARI_AI_TOKEN`.
- Agent pipeline (plan → fan-out → synthesize) with usage aggregation.
- Web UI (single page served by the app): question in, briefing + panel table out.
- CLI demo (`npm run demo -- "<question>"`).
- Unit tests for the pipeline using an injected fake transport (no network).

Out of scope (deliberately, deadline-driven):
- Web search / code-execution tools via Otari (listed as a stretch in TASKS.md; the gateway supports them, wiring + verifying them needs a live token we don't have yet).
- Persistence, accounts, history. Streaming. Deployment.

## Success criteria

- `npm test` green; `npm run demo` produces a full briefing in mock mode with no env set.
- Setting `OTARI_AI_TOKEN` (and a provider key configured on otari.ai) is the *only* change needed for real calls.
- README contains setup, the Otari features used, and a minute-by-minute demo script for the 3–5 min video.
