import { extractSqlFromAssistantText } from "@sbfn/chat/utils/extractSqlFromAssistantText/extractSqlFromAssistantText.ts";
import { describe, expect, it } from "vitest";

describe("extractSqlFromAssistantText", () => {
  it("returns undefined for empty input", () => {
    expect(extractSqlFromAssistantText("")).toBeUndefined();
  });

  it("returns the SQL inside a fenced ```sql block", () => {
    const text =
      "Here is the query:\n```sql\nSELECT region, COUNT(*) FROM cases\n```\n";
    expect(extractSqlFromAssistantText(text)).toBe(
      "SELECT region, COUNT(*) FROM cases",
    );
  });

  it("handles a fenced ```duckdb block", () => {
    const text = "```duckdb\nSELECT 1 FROM t\n```";
    expect(extractSqlFromAssistantText(text)).toBe("SELECT 1 FROM t");
  });

  it("falls back to a bare SELECT statement when no fence is present", () => {
    const text =
      "I'll run this: SELECT region, COUNT(*) AS n FROM cases GROUP BY region;";
    expect(extractSqlFromAssistantText(text)).toBe(
      "SELECT region, COUNT(*) AS n FROM cases GROUP BY region",
    );
  });

  it("recognizes WITH ... SELECT patterns", () => {
    const text =
      "WITH grouped AS (SELECT region, COUNT(*) AS n FROM cases GROUP BY region) SELECT * FROM grouped";
    const sql = extractSqlFromAssistantText(text);
    expect(sql).toContain("WITH grouped AS");
    expect(sql).toContain("SELECT * FROM grouped");
  });

  it("ignores prose that contains the word SELECT without an actual query", () => {
    const text =
      "Please select the dataset you would like to query and try again.";
    expect(extractSqlFromAssistantText(text)).toBeUndefined();
  });

  it("ignores text with no SQL markers", () => {
    expect(
      extractSqlFromAssistantText("I'm not sure what you mean: clarify?"),
    ).toBeUndefined();
  });
});
