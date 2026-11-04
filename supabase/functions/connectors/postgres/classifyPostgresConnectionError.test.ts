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

describe("classifyPostgresConnectionError - SSL-only servers", () => {
  it("classifies a pg_hba rejection of an unencrypted connection as ssl_required, not auth_failed", () => {
    // A server whose pg_hba.conf only has `hostssl` lines rejects a
    // non-SSL connection with SQLSTATE 28000, the same class as a bad
    // password, so the message is what tells the two apart.
    const error = Object.assign(
      new Error(
        'no pg_hba.conf entry for host "203.0.113.5", user "reader", database "postgres", no encryption',
      ),
      { code: "28000" },
    );
    expect(classifyPostgresConnectionError(error)).toBe("ssl_required");
  });

  it("still classifies a wrong password as auth_failed", () => {
    const error = Object.assign(
      new Error('password authentication failed for user "reader"'),
      { code: "28P01" },
    );
    expect(classifyPostgresConnectionError(error)).toBe("auth_failed");
  });
});

describe("classifyPostgresConnectionError - statement timeouts", () => {
  it("classifies a statement cancelled by statement_timeout as timeout", () => {
    // A server set to another language words the message without "timeout",
    // so only the 57014 code identifies it.
    const error = Object.assign(
      new Error("Anweisung wegen Zeitüberschreitung abgebrochen"),
      { code: "57014" },
    );
    expect(classifyPostgresConnectionError(error)).toBe("timeout");
  });
});
