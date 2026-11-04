import { defineConfig } from "drizzle-kit";

// drizzle-kit does not load Next's env files, so read .env.local here (Node 22+ built-in).
// On Vercel or CI the variables already exist and the file does not, which is fine.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local: rely on the real environment
}

const url = process.env.DATABASE_URL_UNPOOLED;
if (!url)
  throw new Error("DATABASE_URL_UNPOOLED is not set (see .env.example).");

export default defineConfig({
  dialect: "postgresql",
  schema: ["./src/db/schema/app.ts", "./src/db/schema/legacy.ts"],
  out: "./drizzle",
  // Only manage our two schemas; leave anything else in the database alone.
  schemaFilter: ["app", "legacy"],
  // Migrations use the direct (unpooled) connection.
  dbCredentials: { url },
});
