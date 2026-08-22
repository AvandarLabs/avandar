import { describe, expect, it } from "vitest";

import { OfflineSqlHallucinationSubstitutions } from "@/components/ChatPanel/offlineChatHelpers/repairOfflineGeneratedSql/OfflineSqlHallucinationSubstitutions/OfflineSqlHallucinationSubstitutions";

describe("OfflineSqlHallucinationSubstitutions.normalizeSelectTopToLimit", () => {
  it("converts SELECT TOP to LIMIT", () => {
    expect(
      OfflineSqlHallucinationSubstitutions.normalizeSelectTopToLimit(
        'SELECT TOP 100 * FROM "t"',
      ),
    ).toBe('SELECT * FROM "t" LIMIT 100');
  });
});

describe("OfflineSqlHallucinationSubstitutions.apply", () => {
  it("quotes bare FROM identifiers", () => {
    const result = OfflineSqlHallucinationSubstitutions.apply(
      "SELECT * FROM covid_deaths",
    );
    expect(result.sql).toContain('FROM "covid_deaths"');
  });
});
