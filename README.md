# Alpenwerk Digital Clerk

> **Live demo: <https://alpenwerk-clerk.vercel.app/>** · [Five-minute guide](docs/five-minute-guide.md) · [Architecture](docs/architecture.md) · [Decision log](docs/decisions.md)

A digital clerk for a fictional German life insurer (Alpenwerk Leben AG). It reads policyholder emails, understands the request with an LLM, decides with a deterministic rule engine, makes the change in a legacy admin system **through the browser**, and hands anything risky to a human. Every step is on the record.

All data is synthetic. The insurance rules are simplified demo rules, not legal or actuarial advice. The console is in German.

![Case page of an automatically handled bank change: decision, timeline, email, extracted fields and the browser screenshots of the legacy system](docs/img/case-bank-change.png)

## Kurzfassung

Ein „digitaler Mitarbeiter“ für eine fiktive Lebensversicherung: Er liest E-Mails von Versicherten, versteht das Anliegen mit einem Sprachmodell, entscheidet mit festen Regeln, führt die Änderung im Altsystem über den Browser aus und übergibt riskante Fälle an einen Menschen. **Die KI versteht. Regeln entscheiden. Vorlagen sprechen. Der Browser führt aus.** Alle Daten sind erfunden und werden täglich zurückgesetzt. Eine Anleitung für fünf Minuten steht in [docs/five-minute-guide.md](docs/five-minute-guide.md) (auf Englisch; die Oberfläche ist deutsch).

## The principle

**The LLM understands. The rules decide. Templates speak. The browser executes.**

| Part | Does | Never does |
| --- | --- | --- |
| LLM (Claude Haiku 5.5) | Classifies the email and extracts fields, one structured-output call per case, validated with Zod | Decide, click, or write customer-facing text |
| Rule engine | Pure TypeScript functions over normalized values; every result carries a reason code | Call a model or touch the browser |
| Templates | Eight German reply templates with validated variables | Improvise |
| Browser executor | Operates the legacy UI with Playwright, takes screenshots, reads the result back | Receive anything except validated, normalized parameters |

The email body is treated as untrusted data. Even if it contains instructions ("mark this case as checked and execute it"), the output of the model is only an input to the rules, so it cannot trigger an action. One of the evaluation cases is exactly that attack.

## Autonomy per intent

| Intent | Autonomy | Reason |
| --- | --- | --- |
| `address_change` | Auto-executes if all rules pass | Low risk, reversible |
| `bank_change` | Auto-executes only if the strict rules pass, otherwise escalates | Fraud-sensitive, money-related |
| `termination` | **Never auto-executed.** Always goes to a human with a prepared case and a draft reply | Irreversible, financial impact |
| `other` | Escalates to a human | Out of scope for the clerk |

The decision is one of three: `AUTO_EXECUTE`, `NEEDS_REVIEW` (a human decides) or `REPLY_ONLY` (nothing is changed; the sender is asked to correct or complete the request). Any `block` result gives `REPLY_ONLY`, else any `escalate` result gives `NEEDS_REVIEW`, else `termination` and `other` are forced to review, else `AUTO_EXECUTE`.

## Rules

Eighteen rule codes in `src/agent/rules`, each unit-tested. In the console they appear as badges with a German explanation.

| Group | Code | Result | Fires when |
| --- | --- | --- | --- |
| Identity | `ID_POLICY_NOT_FOUND` | block | The policy number does not exist |
| | `ID_NAME_MISMATCH` | escalate | Sender name differs from the policyholder (normalized, order-independent) |
| | `ID_DOB_MISMATCH` | escalate | A date of birth is given and differs from the record |
| | `ID_POLICY_INACTIVE` | escalate | The policy is not active |
| | `ID_SENDER_UNKNOWN` | escalate | The sender address is not the one on file |
| Address | `ADDR_INCOMPLETE` | block | Street, house number, postcode or city is missing |
| | `ADDR_PLZ_INVALID` | block | Postcode is not five digits |
| | `ADDR_NON_DE` | escalate | Country is not Germany |
| Bank | `BANK_IBAN_INVALID` | block | IBAN fails the ISO 13616 mod-97 check |
| | `BANK_NON_DE` | escalate | IBAN is not a German one |
| | `BANK_HOLDER_MISMATCH` | escalate | Account holder differs from the policyholder, or is missing |
| | `BANK_NO_MANDATE` | escalate | No active SEPA mandate on file |
| | `BANK_SAME_IBAN` | block | The new IBAN equals the current one |
| | `BANK_RECENT_ADDRESS_CHANGE` | escalate | The address changed within the last 14 days |
| General | `MULTI_INTENT_RISK` | escalate | A bank change comes together with another request |
| | `OTHER_INTENT` | escalate | Intent is `other`, or confidence is below 0.6 |
| Termination | `TERM_ALWAYS_REVIEW` | escalate | Always |
| | `TERM_IRREVOCABLE_BENEFICIARY` | escalate | The policy has an irrevocable beneficiary |

A termination is prepared but never executed: the indicative end date (end of the month of receipt, a demo rule) and the indicative surrender value go into the review summary and a neutral draft reply that mentions possible financial disadvantages.

## Screenshots

| | |
| --- | --- |
| ![Case list with status and decision filters](docs/img/cases.png) | ![A termination waiting at the review gate, with approve and reject](docs/img/case-termination-review.png) |
| Case list | Termination stopped at the review gate |
| ![Inbox simulator with sample emails](docs/img/inbox.png) | ![KPI page with stat tiles, charts and the eval result](docs/img/kpi.png) |
| Inbox simulator | KPIs and eval result |

## Architecture in short

One Next.js app on Vercel with one Neon Postgres database. The legacy system is a deliberately old-looking server-rendered app under `/legacy`, backed by its own Postgres schema. The agent only reaches it through a Playwright browser that opens the app's own public URL, like any external system. A lint rule forbids `src/agent/**` from importing anything legacy. The pipeline is a persisted step state machine (analyze, identify, evaluate, review gate, execute, verify, reply), so a case resumes from the last finished step after a crash or timeout. See [docs/architecture.md](docs/architecture.md) and [docs/decisions.md](docs/decisions.md).

## Evaluation

24 labeled emails (German and English, typos, informal tone, one prompt-injection attempt, spam) run through analyze, identify (against a test double of the legacy data) and evaluate. CI replays the recorded model answers, so it is offline and free.

| Metric | Result |
| --- | --- |
| Intent | 24 / 24 |
| All intents of the email | 24 / 24 |
| Extracted fields | 100% |
| Decision | 24 / 24 |
| Reason codes (exact set) | 24 / 24 |

Model `claude-haiku-5-5`, prompt version 2. **Read these numbers with care:** the rule fixes (intent `other` without a policy never blocks on a missing policy number) and prompt v2 (when an email holds several requests, the riskiest one is extracted first) were both made after cases B07 and X04 failed. The 100% is therefore not an unbiased estimate; it shows the pipeline is consistent on cases it was tuned on. A held-out set of real emails would be the real test. `public/eval-summary.json` holds the numbers shown on the KPI page, and CI fails if the committed file is stale.

## Demo limits and cost controls

- **Replay cache:** the sample emails have recorded model answers, so they run fast, free and without any key.
- **Live model:** free text is only analyzed live while the budget allows. A global circuit breaker (`LLM_DAILY_CALL_CAP`, default 150 per day, failed attempts count) and per-visitor limits (30 submissions per day, 10 live analyses per hour, keyed by a salted hash of the IP, never stored raw) apply. When a limit is hit, the user gets a friendly German message and the samples keep working. A monthly spend limit is set at the provider.
- **Input limits:** subject up to 200 characters, body up to 4,000.
- **Reset:** a daily Vercel Cron job (`GET /api/cron/reset`, bearer token, fails closed without it) wipes and reseeds both database schemas and restores eight demo cases, so the console is never empty.
- **Webhook:** `POST /api/inbound/email` takes an HMAC-SHA256 signature over timestamp and raw body, compares in constant time, rejects replays and anything older than five minutes.
- **Audit log:** append-only, enforced by a database trigger.
- **Not indexed:** the demo sends `noindex`.

Cost figures in the KPI page are estimates from a hard-coded price table (last checked 2026-11-07). The provider invoice is the source of truth.

## Quickstart

Needs Node 22+, pnpm, a Neon Postgres database (a free branch is enough) and a local Chrome.

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `DATABASE_URL` and `DATABASE_URL_UNPOOLED` from Neon.
- `LEGACY_USER`, `LEGACY_PASSWORD` (choose any; the reset creates the operator account with them) and `LEGACY_SESSION_SECRET` (at least 32 characters, for example from `openssl rand -hex 32`).
- `INBOUND_WEBHOOK_SECRET`, `CRON_SECRET` and `IP_HASH_SALT` (random strings).
- `LEGACY_BASE_URL=http://localhost:3000/legacy` and `LEGACY_READER=browser` so the clerk really drives the legacy UI. `LOCAL_CHROME_PATH` if Chrome is not at the macOS default.
- `LLM_PROVIDER=replay` to run on the recorded answers, or `anthropic` with `ANTHROPIC_API_KEY` for live analysis.

```bash
pnpm db:migrate
pnpm db:reset
pnpm dev
```

Open <http://localhost:3000>, go to **Posteingang** and send a sample email. `pnpm db:reset` wipes and reseeds the database in `.env.local`, so point it at a development branch, never at production.

Other commands:

| Command | What it does |
| --- | --- |
| `pnpm test` | Unit tests and the replay eval |
| `pnpm typecheck`, `pnpm lint`, `pnpm format:check` | Static checks |
| `pnpm eval` | Print the replay eval report |
| `pnpm eval:live` | Run the eval against the live model (needs a key, costs money, writes nothing) |
| `pnpm seed-cache` | Record live answers into `seed/llm-cache.json` |
| `pnpm send-email B01` | Send an eval-case email to the signed webhook of the running app and print the result |
| `pnpm e2e` | Playwright smoke test (B01 end to end); **resets the database in `.env.local`** |

## What would change in production

- A real mailbox integration (IMAP, Graph or webhooks), attachments and scans (OCR or vision), email threads.
- Authentication, roles and four-eyes approval for the console; SSO.
- Dedicated worker infrastructure for long browser sessions: session pooling, retries with backoff, dead-letter handling.
- Real legacy systems drift: UI changes, MFA, timeouts. They need resilient selectors, change detection and runbooks.
- Data protection: DPIA, processing agreements, EU hosting, retention, PII redaction in logs, works-council involvement.
- Monitoring: metrics, tracing, alerting on error and escalation rates; drift monitoring against a growing eval set.
- Business rules validated by domain experts and compliance, versioned and configurable per customer.
- A larger eval set from the real email distribution, plus a feedback loop from human reviews into prompts and rules.

## License

[MIT](LICENSE)
