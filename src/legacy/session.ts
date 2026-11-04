import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createSessionToken, verifySessionToken } from "./session-token";

const COOKIE_NAME = "aw_legacy_session";
const SESSION_HOURS = 8;

function secret(): string {
  if (!env.LEGACY_SESSION_SECRET) {
    throw new Error("LEGACY_SESSION_SECRET is not set (min. 32 characters).");
  }
  return env.LEGACY_SESSION_SECRET;
}

export async function startSession(username: string): Promise<void> {
  const expires = new Date(Date.now() + SESSION_HOURS * 3_600_000);
  const token = createSessionToken(
    { sub: username, exp: expires.getTime() },
    secret(),
  );
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/legacy",
    expires,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete({ name: COOKIE_NAME, path: "/legacy" });
}

/** Guard for every protected legacy page: returns the operator name or redirects to login. */
export async function requireOperator(): Promise<string> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = token
    ? verifySessionToken(token, secret(), new Date())
    : null;
  if (!session) redirect("/legacy/login");
  return session.sub;
}
