import { describe, expect, it } from "vitest";
import { sanitizeQueryError } from "@/lib/agent/dataAgent/sanitizeQueryError/sanitizeQueryError";

describe("sanitizeQueryError", () => {
  it("replaces quoted literals, which can hold row values", () => {
    const text = sanitizeQueryError(
      "Conversion Error: Could not convert string 'Los Angeles' to INT64",
    );

    expect(text).not.toContain("Los Angeles");
    expect(text).toContain("'<value>'");
  });

  it("keeps the identifiers the model needs to fix the query", () => {
    const text = sanitizeQueryError(
      'Binder Error: Referenced column "deaths" not found in FROM clause!',
    );

    expect(text).toContain('"deaths"');
    expect(text.startsWith("missing_column:")).toBe(true);
  });

  it("hides dataset ids", () => {
    const text = sanitizeQueryError(
      'Catalog Error: Table with name "86440223-249d-4b3d-9be4-159a4e615e0a" does not exist!',
    );

    expect(text).not.toContain("86440223");
  });
});
