# Decision log

The main design decisions, what else was considered, and why this way. Entries 13 onwards came up while building and are written as built.

| # | Decision | Alternatives considered | Why |
| --- | --- | --- | --- |
| 1 | The LLM extracts, rules decide | Let the model decide, or run an agent loop | Matches "rule-based, traceable, controllable". A prompt injection can change what the model reads, but it cannot trigger an action because the rules and executor never take model output as an instruction |
| 2 | Plain TypeScript pipeline, no agent framework | LangChain, LangGraph | The flow is deterministic. Fewer moving parts, easier to test and to explain |
| 3 | Persisted step state machine in Postgres | In-memory flow, pg-boss, Redis queue | Safe on serverless, resumable from the last finished step, no extra infrastructure |
| 4 | One Next.js app that includes the legacy mock | Separate services | One deploy. The boundary is enforced by a lint rule and by driving the mock only through a browser |
| 5 | Browser automation on a mock legacy UI | Direct database or API calls | Shows that the clerk works inside existing IT without an integration project, the core claim of a digital employee |
| 6 | One LLM call per case, discriminated union on the primary intent | Separate classify and extract calls | Half the latency and cost; one validated object |
| 7 | Templates for replies | Model-written replies | Predictable text, no hallucinated promises, tone under control. Variables are validated and the IBAN is always masked |
| 8 | Different autonomy per intent | One policy for everything | Risk-based automation: address changes can run alone, bank changes under strict rules, terminations never |
| 9 | Replay cache, daily cap and rate limits | Always live | A public demo must be fast, cheap and hard to abuse. Recorded samples always work |
| 10 | Vercel and Neon | A VPS, containers | Free tiers, a stateless app, existing experience. The cost: browser automation on serverless needed a feasibility spike (see 18) |
| 11 | German-only UI, strings in one dictionary | i18n library | Scope. Centralized strings keep English possible later, and a test keeps literals out of components |
| 12 | A small model (Claude Haiku 5.5) | A larger model | Extraction is a simple task; cost and latency matter. The rules, not the model, carry the risk |
| 13 | Hard-coded price table for cost estimates | Store tokens only and compute cost on read | Per-call cost in logs and on the KPI page, labeled as an estimate. The table has a "checked on" date and was re-checked before going live. The invoice is the source of truth |
| 14 | The daily cap counts live calls only, and failed attempts count | Count cache hits too; count only successes | Cached samples must always work. A retry storm against a failing provider must trip the breaker |
| 15 | Intent `other` without a policy number never blocks on `ID_POLICY_NOT_FOUND` | Relabel spam as reply-only | `other` always goes to a human, and spam or complaints often carry no policy number. Found through eval case X04 |
| 16 | When an email holds several requests, extract the riskiest as primary (`bank_change`, then `termination`, then `address_change`) | Let the model choose; relabel the case | Otherwise the bank fields are dropped from the extraction. The riskiest request is always extracted and ruled on. Found through eval case B07 (prompt v2) |
| 17 | Replies of cases without a human are sent (simulated) automatically; reviewed cases keep a draft until a human sends it | Every reply waits for a click | The straight-through rate stays meaningful, and a human is already in the loop wherever a case is risky |
| 18 | `playwright-core` with `@sparticuz/chromium` on Vercel, versions pinned | A `puppeteer-core` driver, a hosted browser, replaying recorded runs | Worked on a Vercel preview in about a second per screenshot once the Chromium binaries were included in the function bundle. The driver is behind an interface, so another implementation could replace it |
| 19 | The review decision is read from the stored `reviews` row | A flag passed into the runner | The decision survives a crash and cannot be forged by a caller. A double submit writes one review |
| 20 | Termination is never written, even after approval | Let an approved termination run | Irreversible and financially significant. The human decides in the real system; the clerk prepares the case and a neutral reply |
| 21 | Append-only audit log enforced by a database trigger | Convention in application code | The guarantee holds even if the application code is wrong. The reset uses TRUNCATE, which the row triggers do not fire for |
| 22 | The Neon HTTP driver for queries and the WebSocket driver for transactions | One driver for both | HTTP is the simplest on serverless, but interactive transactions (reset, review decision) need the WebSocket driver |
| 23 | Replay eval in CI with a committed result file and a drift check | Run the live model in CI | CI stays offline, free and deterministic. The committed summary feeds the KPI page, and CI fails if it is stale |

## Known weakness of the eval

The rules and prompt v2 were tuned on the same 24 cases (decisions 15 and 16), so the 100% result is not an unbiased estimate. A real estimate needs a held-out set of emails the rules were never adjusted against.

## What would change in production

See the [README](../README.md#what-would-change-in-production).
