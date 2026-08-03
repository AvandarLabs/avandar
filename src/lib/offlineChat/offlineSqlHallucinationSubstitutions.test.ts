import { describe, expect, it } from "vitest";
import {
  applyOfflineSqlHallucinationSubstitutions,
  normalizeSelectTopToLimit,
} from "./offlineSqlHallucinationSubstitutions";

describe("normalizeSelectTopToLimit", () => {
  it("converts SELECT TOP to LIMIT", () => {
    expect(normalizeSelectTopToLimit('SELECT TOP 100 * FROM "t"')).toBe(
      'SELECT * FROM "t" LIMIT 100',
    );
  });
});

describe("applyOfflineSqlHallucinationSubstitutions", () => {
  it("quotes bare FROM identifiers", () => {
    const result = applyOfflineSqlHallucinationSubstitutions(
      "SELECT * FROM covid_deaths",
    );
    expect(result.sql).toContain('FROM "covid_deaths"');
  });
});
