# Triangulate — Mozilla Otari Hackathon entry

A multi-model research agent: one question, answered independently by several LLMs through **Otari** (Mozilla AI's gateway), then cross-examined into a briefing with consensus, dissent, and per-model token accounting.

- **App & full README:** [`app/`](app/README.md) — setup, Otari features used, demo script, feedback draft.
- **Research on the hackathon + Otari:** [`RESEARCH.md`](RESEARCH.md)
- **Concept & scope:** [`SPEC.md`](SPEC.md) · **Architecture:** [`DESIGN.md`](DESIGN.md) · **Checklist:** [`TASKS.md`](TASKS.md)
- **Hackathon branch:** `otari-hackathon` — the first commit on it that introduces Otari is the gateway-client commit (`app/src/otari.ts`).

Quick start: `cd app && npm install && npm run demo` (runs in clearly-labelled mock mode with no secrets; set `OTARI_AI_TOKEN` from otari.ai for live calls).
