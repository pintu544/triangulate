# Mozilla Otari Hackathon — Research

Researched 2026-11-11 (evening IST), web only, no logins.

## The event

- **Name:** "Mozilla Otari Hackathon — Devs Wilding Online!" = MozFest's *Developers Wilding: Online*, run by Mozilla AI / Mozilla.org on DoraHacks.
- **DoraHacks page:** https://dorahacks.io/hackathon/mozilla-devs-wilding/detail
- **Theme:** "Finish your side projects using Otari." Two-week online hackathon, kicked off Oct 28, 2026 alongside MozFest Barcelona.
- **Prizes (total $1,200):**
  - 1st: $1,000 + 3 hours with Mozilla.ai engineers
  - 2nd: $200 + 2 hours with Mozilla.ai engineers
  - 3rd: 1 hour with Mozilla.ai engineers
- **Deadline:** The DoraHacks detail page (crawled 2026-11-01) says "DEADLINE: Nov 11th 11:59PM TO SUBMIT YOUR PROJECT" — timezone not stated on the page. Event listings give the event window ending Nov 11, 22:59 UTC (Eventbrite) / Nov 12 ~07:00 UTC. **Operative deadline given by the owner: Thu 12 Nov 2026, 04:29 IST.** Treat the owner's time as the hard cutoff; the page text suggests the real cutoff may be earlier in some timezones, so earlier is safer.

## The core requirement

> "This online hackathon encourages you to finish any side projects you have **with the requirement that you use Otari.ai as your hosted AI gateway**."

So the project must call the **hosted otari.ai platform** (not only a self-hosted Otari gateway). Otari is open source, so self-hosting afterwards is fine, but the hackathon build must route model calls through otari.ai.

## Submission requirements (verbatim structure from the DoraHacks page)

"If your submission does not include these items, you will not be eligible for prizes."

1. Project name, the email address used to sign up to Otari.ai, and one line on what the project does.
2. Public GitHub repository link + the hackathon branch name.
3. Proof of Otari use: link to the **first commit on that branch where Otari came in**.
4. **Otari features used** (the rubric lists the features — see Judging below).
5. Any PRs or issues opened on the Otari repo (mozilla-ai/otari).
6. Link to a **3–5 minute project demo video** — "Show us the progress you made with Otari!"
7. **Feedback** (either or both):
   - A 3–5 min Otari feedback screen recording answering: (1) What did you build with Otari and which features did you use? (2) What worked well? (3) What didn't work? (bugs/friction, with repro steps) (4) What's missing / what would you change?
   - Written feedback answering: (1) When were you most tempted to skip Otari and call the provider directly? What happened? (2) What did you end up building yourself that Otari should've done for you? (3) If the rules hadn't required Otari, would you have continued using it? Why / why not?

## Participation steps (from the DoraHacks page)

1. Sign up on DoraHacks with: name/pseudonym, **the email that will be used for the Otari.ai signup**, one sentence explaining the project. — *Done by owner on 6 Nov (idea-stage sentence).*
2. Sign up for the hosted platform at **otari.ai**. "The first 200 people to sign up get $20 in tokens at Otari.ai." — **Pintu-only (account creation).** Whether the $20 credit is still available is unverified.
3. Join the Mozilla OSAI Discord and take the **devs-wilding role** (link on the DoraHacks page; also discord.gg/TqvzGH9mwz per Mozilla.ai's LinkedIn post). — **Pintu-only.**
4. **Star the Otari repo** https://github.com/mozilla-ai/otari — requested twice on the page ("please star the Otari repo, it helps!"). — **Pintu-only (his GitHub account)** — the parent agent may be able to do this if it operates his logged-in GitHub; as a no-login research pass, treat as Pintu/parent.
5. Build on a branch in the project repo using Otari.ai.

## Judging

- The DoraHacks page links a "Hackathon Rubric" ("Read through the rubric here") and says submission item 4 (Otari features used) refers to a feature list in that rubric. **The rubric document itself could not be read in this pass (link target not extractable from the crawled page) — exact judging criteria/scores are UNVERIFIED.**
- What is verifiable from the page: judging clearly weighs (a) genuine use of Otari.ai as the gateway, (b) which/how many Otari features are used, (c) the demo video showing progress made with Otari, and (d) quality/honesty of the product feedback (bugs and friction are explicitly solicited — this is a product-feedback-driven hackathon run by the Otari team).

## What Otari is, technically

- **Otari** (by Mozilla AI) is an open-source, **OpenAI-compatible LLM gateway**: one endpoint in front of 40+ providers (routing via Mozilla's `any-llm`), with virtual API keys, per-key budgets enforced before dispatch, and usage tracking. Apache-2.0. Repo: https://github.com/mozilla-ai/otari
- **otari.ai** is the hosted version of the same gateway, run by Mozilla AI.
- Server-side tools on the gateway give open-weight models capabilities they lack natively: **web search** and **code execution**, plus transcription/image endpoints and batch APIs (per Mozilla AI product pages and launch coverage).
- **Hosted API shape (from the official `otari` PyPI package docs):**
  - Default hosted base URL: `https://api.otari.ai` (OpenAI-compatible surface under `/v1`, e.g. `POST https://api.otari.ai/v1/chat/completions`).
  - Auth: a **platform token** created at `otari.ai/organization-settings/api-tokens`, sent as `Authorization: Bearer <token>`.
  - You must also add at least one **provider key** at `otari.ai/organization-settings/provider-keys` so the gateway can route to that provider (unless using platform-provided models/credits — unverified which models the $20 signup credit covers).
  - Model strings use `provider:model` form, e.g. `openai:gpt-4o-mini`, `openai:gpt-4o`. Switching providers = changing the model string, nothing else.
- Self-hosted mode (not the hackathon requirement, for reference): gateway on `:8000`, `POST /api/v1/chat/completions` (also `/v1/chat/completions` per quickstart), bootstrap `gw-...` API keys, master key for key management, dashboard at `/`.

## Sources

- DoraHacks hackathon detail page: https://dorahacks.io/hackathon/mozilla-devs-wilding/detail
- Eventbrite listing (dates, prizes): https://www.eventbrite.com/e/mozilla-otari-hackathon-devs-wilding-online-tickets-2004056639356
- Mozilla.ai LinkedIn post (challenge wording, Discord, $20 tokens for first 200): https://www.linkedin.com/company/mozilla-ai (post dated 2026-10-28)
- Otari repo README (gateway architecture, quickstart, endpoints): https://github.com/mozilla-ai/otari
- `otari` Python client docs (hosted base URL, platform token, provider keys, `provider:model` strings): https://pypi.org/project/otari/0.1.1/
- Mozilla AI Otari product page: https://www.mozilla.ai/product/otari
- DoraHacks newsletter (tags: "Open weight models · Open source · LLM gateway"): https://hidorahacks.medium.com/dorahacks-hackathon-newsletter-november-2026-ii-5761efa2275b

## Feasibility notes

- No Otari SDK is needed from Node/TypeScript: the hosted gateway is plain OpenAI-compatible HTTPS, so `fetch` + a Bearer token is the whole integration.
- The one hard external dependency is the **otari.ai account + platform token + a configured provider key** — all Pintu-only account steps. The build therefore ships with a clearly-labelled **mock mode** (deterministic canned multi-model responses) that runs with zero secrets, and switches to real Otari calls the moment `OTARI_AI_TOKEN` is set.
