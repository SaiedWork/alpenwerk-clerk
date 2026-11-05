import { describe, expect, it } from "vitest";
import { clientIp, hashIp, IpHashConfigError } from "@/lib/ip-hash";

describe("clientIp", () => {
  it("takes the first hop of x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1" });
    expect(clientIp(h)).toBe("203.0.113.7");
  });
  it("returns null without the header", () => {
    expect(clientIp(new Headers())).toBeNull();
    expect(clientIp(new Headers({ "x-forwarded-for": "" }))).toBeNull();
  });
});

describe("hashIp", () => {
  it("is stable, salted and never contains the address", () => {
    const a = hashIp("203.0.113.7", "salt-a");
    expect(hashIp("203.0.113.7", "salt-a")).toBe(a);
    expect(hashIp("203.0.113.7", "salt-b")).not.toBe(a);
    expect(hashIp("203.0.113.8", "salt-a")).not.toBe(a);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("203");
  });
  it("fails closed without a salt", () => {
    expect(() => hashIp("203.0.113.7", undefined)).toThrow(IpHashConfigError);
    expect(() => hashIp("203.0.113.7", "")).toThrow(IpHashConfigError);
  });
});
