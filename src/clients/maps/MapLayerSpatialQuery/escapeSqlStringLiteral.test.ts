import { describe, expect, it } from "vitest";
import { escapeSqlStringLiteral } from "./escapeSqlStringLiteral";

describe("escapeSqlStringLiteral", () => {
  it("wraps a scalar as a single-quoted SQL literal", () => {
    expect(escapeSqlStringLiteral("district")).toBe("'district'");
  });

  it("doubles embedded single quotes", () => {
    expect(escapeSqlStringLiteral("O'Brien")).toBe("'O''Brien'");
  });

  it("does not treat SQL punctuation as syntax", () => {
    expect(escapeSqlStringLiteral("x'); DROP TABLE maps; --")).toBe(
      "'x''); DROP TABLE maps; --'",
    );
  });
});
