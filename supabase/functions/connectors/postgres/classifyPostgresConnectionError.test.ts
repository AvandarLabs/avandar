import { UnsafeHostError } from "@sbfn/_shared/validateHostNotPrivate.ts";
import { classifyPostgresConnectionError } from "@sbfn/connectors/postgres/classifyPostgresConnectionError.ts";
import { describe, expect, it } from "vitest";

describe("classifyPostgresConnectionError", () => {
  it("classifies the SSRF guard's own error as host_not_allowed, not unknown", () => {
    const error = new UnsafeHostError("169.254.169.254", "169.254.169.254");
    expect(classifyPostgresConnectionError(error)).toBe("host_not_allowed");
  });

  it("classifies an unresolvable host (DNS lookup failure) as unreachable", () => {
    const error = Object.assign(new Error("getaddrinfo ENOTFOUND bad.host"), {
      code: "ENOTFOUND",
    });
    expect(classifyPostgresConnectionError(error)).toBe("unreachable");
  });

  it("falls back to unknown for an unrecognized error shape", () => {
    expect(classifyPostgresConnectionError(new Error("something odd"))).toBe(
      "unknown",
    );
  });
});
