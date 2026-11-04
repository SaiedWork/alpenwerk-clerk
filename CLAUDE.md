# Alpenwerk Digital Clerk

Demo of a controlled "digital employee" for a fictional German life insurer (Alpenwerk Leben AG).
All data is synthetic. Principle: the LLM understands, rules decide, templates speak, the browser executes.

## Commands

```bash
pnpm dev          # dev server on http://localhost:3000
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
pnpm test         # vitest run (tests/ and evals/)
pnpm format       # prettier --write
pnpm format:check # prettier --check
pnpm db:generate  # drizzle-kit: create a migration from src/db/schema changes
pnpm db:migrate   # apply migrations in drizzle/ to the database in .env.local
pnpm db:studio    # drizzle studio
```

Node 22+ and pnpm are required. Add new scripts here when they are introduced.

## Stack

Next.js (App Router, `src/` dir), React, TypeScript strict, Tailwind 4, shadcn/ui (`base-nova` style, Base UI primitives,
add components with `pnpm dlx shadcn@latest add <name>`), Drizzle ORM (stable 0.45) + Neon Postgres, Vitest, Zod.
Planned: Vercel AI SDK, Playwright.

## Structure

- `src/app/` routes only; route files compose feature components (`page.tsx` stays around 30 lines).
- `src/features/<feature>/{components,server,schemas}` feature code.
- `src/agent/` pipeline, steps, llm, rules, executor, templates.
- `src/legacy/` mock legacy admin system. `src/agent/**` must never import from it or from `src/db/schema/legacy*` (enforced by an ESLint `no-restricted-imports` rule).
- `src/db/` Drizzle schemas (`schema/app.ts`, `schema/legacy.ts`, one Postgres schema each), `getDb()` (HTTP driver, queries) and `withTransaction()` (WebSocket driver, interactive transactions). Migrations live in `drizzle/` and are committed; change a schema, then run `pnpm db:generate`. Local `.env.local` points at the Neon `dev` branch, never at production.
- `src/lib/` small shared utilities (env, logger, normalization, dates). Read config through `env` from `src/lib/env.ts`, never `process.env`; log through `logger` / `caseLogger`.
- `tests/` mirrors `src/`.

## Code conventions

- Strict TypeScript, no `any`. Validate all external input (env, API bodies, LLM output) with Zod.
- Prefer small files, pure functions and simple readable code over clever code.
- Pipeline steps are idempotent, `(ctx) => Promise<StepResult>`, and write an event row.
- Typed error classes with a `code`; never swallow errors.
- German UI strings come from one dictionary file; code, comments, logs and docs are in English.
- Dates are stored in UTC and displayed in `Europe/Berlin`.
- Conventional commits, one focused change per commit.
