/** Thrown when a database connection string is needed but not configured. */
export class DatabaseConfigError extends Error {
  readonly code = "DB_NOT_CONFIGURED";

  constructor(variable: "DATABASE_URL" | "DATABASE_URL_UNPOOLED") {
    super(
      `${variable} is not set. Copy .env.example to .env.local and fill it in.`,
    );
    this.name = "DatabaseConfigError";
  }
}
