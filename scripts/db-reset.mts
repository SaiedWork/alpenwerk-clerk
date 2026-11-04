// Local reset: wipes and reseeds the database that .env.local points at (the Neon `dev` branch).
import { resetDatabase } from "@/db/reset";
import { env } from "@/lib/env";

if (process.env.VERCEL_ENV === "production") {
  throw new Error("Refusing to reset a production deployment from the CLI.");
}

const host = new URL(env.DATABASE_URL_UNPOOLED ?? "postgres://missing").host;
console.log(`Resetting database on ${host} ...`);

const summary = await resetDatabase();
console.log("Done:", summary);
