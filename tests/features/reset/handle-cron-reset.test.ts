import { describe, expect, it, vi } from "vitest";
import { ResetConfigError } from "@/db/reset";
import {
  handleCronReset,
  type CronResetDeps,
} from "@/features/reset/server/handle-cron-reset";

vi.mock("@/lib/env", () => ({ env: { LOG_LEVEL: "silent" } }));
vi.mock("@/db/tx", () => ({ withTransaction: vi.fn() }));
vi.mock("@/db/client", () => ({ getDb: vi.fn() }));

const secret = "0123456789abcdef-secret";

function setup(
  reset: CronResetDeps["reset"],
  options: { secret?: string } = { secret },
) {
  const resetSpy = vi.fn(reset);
  let tick = 1000;
  const deps: CronResetDeps = {
    secret: options.secret,
    reset: resetSpy,
    now: () => (tick += 250),
  };
  const call = (authorization?: string) =>
    handleCronReset(
      new Request("http://localhost/api/cron/reset", {
        headers: authorization ? { authorization } : {},
      }),
      deps,
    );
  return { call, resetSpy };
}

const summary = { seededCacheEntries: 24 } as Awaited<
  ReturnType<CronResetDeps["reset"]>
>;

describe("handleCronReset", () => {
  it("resets and reports the duration for the correct bearer token", async () => {
    const { call, resetSpy } = setup(async () => summary);
    const response = await call(`Bearer ${secret}`);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      durationMs: 250,
      seededCacheEntries: 24,
    });
    expect(resetSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["no header", undefined],
    ["wrong token", "Bearer wrong"],
    ["wrong scheme", `Basic ${secret}`],
  ])("%s: 401 and the reset never runs", async (_name, header) => {
    const { call, resetSpy } = setup(async () => summary);
    const response = await call(header);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "UNAUTHORIZED" });
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when no secret is configured", async () => {
    const { call, resetSpy } = setup(async () => summary, {});
    const response = await call(`Bearer ${secret}`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "NOT_CONFIGURED" });
    expect(resetSpy).not.toHaveBeenCalled();
  });

  it("maps a missing legacy credential to 503 with its code", async () => {
    const { call } = setup(async () => {
      throw new ResetConfigError("LEGACY_USER");
    });
    const response = await call(`Bearer ${secret}`);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "RESET_NOT_CONFIGURED" });
  });

  it("returns a generic 500 and does not echo the error text", async () => {
    const { call } = setup(async () => {
      throw new Error("connection to postgres://user:pw@host failed");
    });
    const response = await call(`Bearer ${secret}`);
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).toBe('{"error":"RESET_FAILED"}');
  });
});

describe("cron route module", () => {
  it("serves GET only and is never cached", async () => {
    const route = await import("@/app/api/cron/reset/route");
    expect(typeof route.GET).toBe("function");
    expect("POST" in route).toBe(false);
    expect(route.dynamic).toBe("force-dynamic");
  });
});
