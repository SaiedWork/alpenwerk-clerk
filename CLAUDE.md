# Alpenwerk Digital Clerk

Demo of a controlled "digital employee" for a fictional German life insurer (Alpenwerk Leben AG).
All data is synthetic. Principle: the LLM understands, rules decide, templates speak, the browser executes.

## Commands

```bash
pnpm dev          # dev server on http://localhost:3000
pnpm build        # production build
pnpm typecheck    # tsc --noEmit
pnpm lint         # eslint
```

Node 22+ and pnpm are required. Add new scripts here when they are introduced.

## Stack

Next.js (App Router, `src/` dir), React, TypeScript strict, Tailwind. Planned: shadcn/ui, Drizzle + Neon Postgres,
Vercel AI SDK, Playwright, Vitest, Zod.

## Structure

- `src/app/` routes only; route files compose feature components (`page.tsx` stays around 30 lines).
- `src/features/<feature>/{components,server,schemas}` feature code.
- `src/agent/` pipeline, steps, llm, rules, executor, templates.
- `src/legacy/` mock legacy admin system. `src/agent/**` must never import from it.
- `src/lib/` small shared utilities (env, logger, normalization, dates).
- `tests/` mirrors `src/`.

## Code conventions

- Strict TypeScript, no `any`. Validate all external input (env, API bodies, LLM output) with Zod.
- Prefer small files, pure functions and simple readable code over clever code.
- Pipeline steps are idempotent, `(ctx) => Promise<StepResult>`, and write an event row.
- Typed error classes with a `code`; never swallow errors.
- German UI strings come from one dictionary file; code, comments, logs and docs are in English.
- Dates are stored in UTC and displayed in `Europe/Berlin`.
- Conventional commits, one focused change per commit.
