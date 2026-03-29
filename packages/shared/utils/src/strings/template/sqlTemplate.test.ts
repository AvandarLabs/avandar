import { sqlTemplate } from "@utils/strings/template/sqlTemplate.ts";
import { describe, expect, it } from "vitest";

describe("sqlTemplate", () => {
  it("interpolates numbers without locale grouping", () => {
    const t = sqlTemplate("HAVING COUNT(*) = $maxCount$");
    expect(t.parse({ maxCount: 1516 })).toBe("HAVING COUNT(*) = 1516");
  });

  it("still passes other unknownToString options", () => {
    const t = sqlTemplate("Null: $n$");
    expect(t.parse({ n: null }, { nullString: "N/A" })).toBe("Null: N/A");
  });
});
