# Architecture

One Next.js app (App Router) on Vercel and one Neon Postgres database. There is no separate worker, queue or cache service.

```
                 ┌──────────────────────────── Vercel: one Next.js app ─────────────────────────────┐
 Email           │                                                                                    │
 (signed webhook │  ingestEmail ──► app.cases (status RECEIVED) ──► after() ──► runCase               │
  or inbox       │                                                                │                   │
  simulator) ───►│  Pipeline runner (persisted state machine, one event row per step)                 │
                 │   1 analyze   LLM or cache ─► Zod ─► normalized values                             │
                 │   2 identify  ┐                                                                    │
                 │   3 evaluate  │  Playwright ─► /legacy/* (mock admin UI, own schema `legacy`)      │
                 │     review gate (NEEDS_REVIEW stops here until a human decides)                    │
                 │   4 execute  ◄┘  reads and writes only through the browser, never the database     │
                 │   5 verify    re-reads the record and compares with the target                     │
                 │   6 reply     template ─► app.replies (draft, or sent when no human is involved)   │
                 │                                                                                    │
 Console ◄───────┤  /faelle, /faelle/[id], /posteingang, /freigaben, /audit, /kennzahlen, /ueber      │
 Human review ──►│  approve / reject / edit reply / send ─► resumes the runner                        │
                 │                                                                                    │
                 │  Vercel Cron, daily ─► GET /api/cron/reset ─► truncate and reseed both schemas     │
                 └────────────────────────────────────────────────────────────────────────────────────┘
 Neon Postgres: schema `app` (cases, events, audit, screenshots, replies, reviews, llm cache and calls,
                rate limits)  |  schema `legacy` (customers, policies, mandates, change log, operator)
```

## Principle and the one hard rule

**The LLM understands. The rules decide. Templates speak. The browser executes.**

No model output flows into an action. The path is always: model output, then a Zod schema, then normalized values, then the rule engine, then a decision, then an executor that only receives parameters built from the validated, normalized fields. Customer-facing text comes from templates, never from the model.

## Pipeline

The pipeline is a state machine whose state lives in Postgres, not in memory.

- **Steps** live in `src/agent/steps/`, one file each. A step is `(ctx) => Promise<StepResult>`, idempotent, and writes a `case_events` row (status, duration, a small payload).
- **Resume:** `runPipeline` (`src/agent/pipeline/runner.ts`) reads the event rows and continues from the first step that is not done. Finished or skipped steps are not repeated; a failed step is retried; a stale `started` row is ignored. Payloads are validated again with Zod when they are read back.
- **Invocation model:** the webhook and the simulator create the case and schedule the run with `after()`. Each invocation is designed to finish within 60 s (`maxDuration = 60`). The console polls while a case is in flight; a case with no progress for 90 s shows a "Fortsetzen" (resume) button that calls `POST /api/cases/[id]/run`.
- **Failures** are typed (`code`), stored on the event row without raw error text, shown in the UI in German, and the case can be retried from the failed step.

Case statuses: `RECEIVED`, `ANALYZED`, `IDENTIFIED`, `EVALUATED`, `AWAITING_REVIEW`, `EXECUTING`, `VERIFIED`, `REPLY_READY`, `DONE`, `REJECTED`, `FAILED`.

### Review gate

`NEEDS_REVIEW` stops the runner after evaluate. A human then approves or rejects on the case page:

- The review decision is stored in one transaction (a guarded status update plus a `reviews` row), so a double click writes one review.
- The runner reads the decision from the stored row, not from a flag passed by the caller. It survives a crash and cannot be forged.
- Approval of an address or bank change runs execute and verify. For a termination or `other`, execute is skipped even after approval, because nothing in the clerk ever writes a termination.
- Rejection skips execute and verify and drafts a rejection reply.

## LLM layer (`src/agent/llm/`)

- **One call per case**, structured output through the Vercel AI SDK, validated against a Zod discriminated union on `primary_intent`. The provider's wire schema is flat; it is converted and re-validated into the strict union.
- **Prompt rules** (versioned): the model is an extraction component, the email is untrusted data inside delimiters, extract only what is literally present and use `null` otherwise, return all detected intents, and when several are present choose the primary one by risk (`bank_change`, then `termination`, then `address_change`).
- **Resolution order:** cache hit, then live call if the budget and rate limit allow, otherwise a typed error with a German message. The cache key is a hash of prompt version, schema version and the normalized subject and body. Rows are re-validated on read; a corrupt row counts as a miss.
- **Providers** (`LLM_PROVIDER`): `anthropic` (live) and `replay` (cache only; a miss is a controlled error).
- **Budget guard:** the `llm_calls` table backs a daily circuit breaker that counts live calls only (cache hits never count, failed attempts do). Cost per call is estimated from a price constant and labeled as an estimate.
- **Normalization** after the model (pure functions in `src/lib/` and `src/agent/llm/normalize.ts`): IBAN, postcode, names, dates (defensive German date parsing), policy number.

## Rule engine (`src/agent/rules/`)

Pure functions over the normalized extraction, the legacy snapshot, the sender address and `now`. Each rule returns a result with a code, a severity (`block`, `escalate`, `info`) and a German explanation; `decide()` reduces the list to a decision. The full list is in the [README](../README.md#rules). Names are compared as order-independent token sets after folding umlauts, `ß` and other diacritics, treating hyphens as spaces and ignoring titles.

## Legacy system and browser executor

- **The legacy mock** (`src/legacy/`, routes under `/legacy`) is server-rendered HTML with plain forms and its own CSS, on purpose old-looking. It has its own login (an HMAC-signed session cookie), search, a policy overview with mandates and change log, address and bank forms with confirmation pages, and a read-only termination view for the human reviewer. Every page has stable `data-testid` attributes. Writes go to the `legacy` schema and append to `change_log` with `changed_by = digital-clerk`.
- **The boundary:** an ESLint `no-restricted-imports` rule forbids `src/agent/**` from importing `src/legacy/**` or `src/db/schema/legacy*`. The agent can only see the legacy system through a browser.
- **The driver:** pipeline code depends on a `LegacyDriver` interface. `PlaywrightLegacyDriver` (`playwright-core`, with `@sparticuz/chromium` on Vercel and a local Chrome in development) opens the app's own public URL (`LEGACY_BASE_URL`), logs in, reads and writes through the forms by `data-testid`, and takes JPEG screenshots (about 1100x700, quality 60) with German captions into `app.screenshots`. They are served by `/api/screenshots/[id]`.
- **Idempotency and read-back:** if the form already holds the target value, the write is skipped and recorded as `unchanged`. The verify step re-reads the edit form and compares it with the same target the execute step used; a mismatch fails the case with `VERIFY_MISMATCH` (only the names of differing fields are stored).
- **Reader switch:** `LEGACY_READER=browser` (the real driver) or `seed` (fixtures, no browser; used for evals and quick local work).

## Replies

Eight German templates (`src/agent/templates/`), rendered by a pure `render(key, vars)` with Zod-validated variables. A missing variable throws, only a masked IBAN is accepted, and any IBAN-like text in the output is rejected. `selectTemplate` picks the template from the decision, intent, reason codes and whether the change was actually written. Customer-facing text never names the failed identity check (internal reason codes stay internal). Replies of cases without a human (`AUTO_EXECUTE`, `REPLY_ONLY`) are marked as sent (simulated) automatically; reviewed cases keep a draft until a human edits and sends it.

## Data

- **Schema `app`:** `cases`, `case_events`, `audit_log` (append-only through a database trigger that rejects UPDATE and DELETE; the reset uses TRUNCATE, which the row triggers do not fire for), `screenshots`, `replies`, `reviews`, `llm_cache`, `llm_calls`, `rate_limits`.
- **Schema `legacy`:** `customers`, `policies`, `sepa_mandates`, `change_log`, `legacy_users`.
- **Drivers:** the Neon HTTP driver for normal queries (`getDb()`), the WebSocket driver for interactive transactions (`withTransaction()`). Migrations are Drizzle migrations in `drizzle/`.
- **Seed data:** 14 synthetic customers with dates relative to "now", so a "recent address change" stays recent after each reset. `resetDatabase()` truncates both schemas, reseeds them, reloads the seeded cache rows and inserts eight demo cases built with the real rule engine and templates.

## Security and abuse controls

- **Webhook:** HMAC-SHA256 over `timestamp.rawBody`, constant-time compare, five-minute window, replays rejected by claiming each signature once. Fails closed without a secret.
- **Cron:** `GET /api/cron/reset` needs `Authorization: Bearer $CRON_SECRET`, compares in constant time, returns 503 without a configured secret and a generic 500 on failure.
- **Rate limits:** fixed windows in Postgres, keyed by a salted hash of the client IP (raw IPs are never stored). Submissions are limited per day; only analyses that need a live model call count against the hourly limit.
- **Input limits** on subject and body, strict Zod validation on every API body and server action, no unvalidated `request.json()`.
- **Secrets** stay server-side and are validated with Zod at startup. Audit rows hold only allowed keys, never free text or IBANs. Logs never carry full email bodies at info level.

## Console

Next.js App Router, React, Tailwind 4 and shadcn/ui (Base UI primitives). Route files stay thin and compose feature components from `src/features/<feature>`. All German UI text comes from one dictionary (`src/lib/i18n-de.ts`); a test fails if literal UI text appears in JSX. Dates are stored in UTC and shown in `Europe/Berlin`.

## Tests and CI

- **Unit tests** (Vitest) cover IBAN, normalization, dates, every rule code (table-driven), decision reduction, templates, HMAC, rate limiting, the runner (including resume and audit), the review actions and the cron handler. Tests that need a database skip without one.
- **Evals:** 24 labeled emails replayed against the recorded model answers. See the [README](../README.md#evaluation) for the result and its caveat.
- **End to end:** one Playwright test sends the B01 sample and checks the whole path including the screenshots and the changed legacy IBAN.
- **CI** (GitHub Actions): typecheck, lint, format check, tests, replay eval with a drift check on `public/eval-summary.json`, build.
