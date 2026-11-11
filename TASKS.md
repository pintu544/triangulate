# TASKS — Triangulate build

## Build
- [x] RESEARCH.md, SPEC.md, DESIGN.md
- [x] Scaffold app (package.json, tsconfig, .gitignore, .env.example)
- [x] `src/otari.ts` — Otari hosted-gateway client + labelled mock transport
- [x] `src/agent.ts` — plan → fan-out → synthesize pipeline, usage aggregation
- [x] `src/server.ts` + `public/index.html` — web UI
- [x] `src/cli.ts` — terminal demo
- [x] Tests (node:test, fake transport): pipeline fan-out count, usage totals, mock-mode labelling, planner fallback
- [x] `npm run build && npm test && npm run demo` verified in mock mode
- [x] README: setup, Otari features used, demo script, feedback draft answers

## Git (submission needs a named branch + first-Otari-commit link)
- [x] Init repo; initial docs commit on `main`
- [x] Branch `otari-hackathon`; FIRST code commit on it = `src/otari.ts` (this is the commit to link in the submission)
- [x] Remaining commits: agent, UI/CLI, tests, README

## Remaining — NOT done by the build agent
- [ ] (Pintu) Create otari.ai account with the same email used on DoraHacks; create platform token; add a provider key (OpenAI/Mistral) in otari.ai settings; grab $20 signup tokens if still offered
- [ ] (Pintu) Star https://github.com/mozilla-ai/otari
- [ ] (Pintu) Join Mozilla OSAI Discord + take the `devs-wilding` role
- [ ] (Parent/Pintu) Push repo to a PUBLIC GitHub repo (branch `otari-hackathon`)
- [ ] (Parent) Set `OTARI_AI_TOKEN`, run one real research question, screenshot Otari dashboard usage for the demo
- [ ] (Pintu) Record 3–5 min demo video + 3–5 min Otari feedback recording (or approve the written feedback drafted in README)
- [ ] (Parent/Pintu) Submit on DoraHacks with all 7 required items before Thu 12 Nov 2026, 04:29 IST
- [ ] (Stretch) Wire Otari web-search tool for panellists once a live token exists; open an issue/PR on mozilla-ai/otari if real friction is found (submission item 5)
