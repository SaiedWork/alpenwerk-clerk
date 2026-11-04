import { z } from "zod";

// Treat `KEY=` (empty string) like an unset variable, so .env.example can be copied as-is.
const optionalString = z.string().min(1).optional();

const envSchema = z.object({
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  DATABASE_URL: optionalString,
  DATABASE_URL_UNPOOLED: optionalString,

  LLM_PROVIDER: z.enum(["anthropic", "ollama", "replay"]).default("replay"),
  ANTHROPIC_API_KEY: optionalString,
  ANTHROPIC_MODEL: z.string().min(1).default("claude-haiku-5-5"),
  OLLAMA_BASE_URL: z.url().default("http://localhost:11434"),
  OLLAMA_MODEL: optionalString,
  LLM_DAILY_CALL_CAP: z.coerce.number().int().positive().default(150),

  RATE_LIMIT_LIVE_PER_HOUR: z.coerce.number().int().positive().default(10),
  RATE_LIMIT_SUBMIT_PER_DAY: z.coerce.number().int().positive().default(30),

  INBOUND_WEBHOOK_SECRET: optionalString,
  CRON_SECRET: optionalString,
  IP_HASH_SALT: optionalString,

  LEGACY_BASE_URL: z.url().default("http://localhost:3000/legacy"),
  LEGACY_USER: optionalString,
  LEGACY_PASSWORD: optionalString,
  // Signs the legacy login cookie. Min. 32 chars; generate with `openssl rand -hex 32`.
  LEGACY_SESSION_SECRET: z.string().min(32).optional(),
  BROWSER_WS_ENDPOINT: optionalString,
});

export type Env = z.infer<typeof envSchema>;

/** Pure and testable: validates a raw variable map and throws a readable error. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const withoutEmpty = Object.fromEntries(
    Object.entries(source).filter(([, value]) => value !== ""),
  );
  const result = envSchema.safeParse(withoutEmpty);
  if (!result.success) {
    throw new Error(
      `Invalid environment variables:\n${z.prettifyError(result.error)}`,
    );
  }
  return result.data;
}

// Server-side only: never import this from client components.
export const env = parseEnv(process.env);
