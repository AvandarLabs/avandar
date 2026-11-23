import { describe, expect, it } from "vitest";
import { buildCandidateLookupSqlFromDiscovery } from "./buildCandidateLookupSqlFromDiscovery";

const DATASET_ID = "b3ce316e-d9e5-4279-89d7-bf42ab0d68fb";
const OTHER_DATASET_ID = "86440223-249d-4b3d-9be4-159a4e615e0a";
const DISCOVERY_SQL = `SELECT DISTINCT "Country/Region" FROM "${DATASET_ID}" ORDER BY "Country/Region" LIMIT 100`;

describe("buildCandidateLookupSqlFromDiscovery", () => {
  it("looks up the candidates in the lookup's dataset and column, ignoring case", () => {
    expect(
      buildCandidateLookupSqlFromDiscovery({
        discoveryQuery: DISCOVERY_SQL,
        column: "Country/Region",
        candidateValues: ["UK", "United Kingdom", "O'Brien"],
      }),
    ).toBe(
      `SELECT DISTINCT "Country/Region" FROM "${DATASET_ID}" WHERE lower(trim(CAST("Country/Region" AS VARCHAR))) IN ('uk', 'united kingdom', 'o''brien')`,
    );
  });

  it("builds nothing without candidates", () => {
    expect(
      buildCandidateLookupSqlFromDiscovery({
        discoveryQuery: DISCOVERY_SQL,
        column: "Country/Region",
        candidateValues: [],
      }),
    ).toBeUndefined();
  });

  it("builds nothing when the lookup reads more than one dataset", () => {
    expect(
      buildCandidateLookupSqlFromDiscovery({
        discoveryQuery: `SELECT DISTINCT "a" FROM "${DATASET_ID}" UNION SELECT DISTINCT "a" FROM "${OTHER_DATASET_ID}"`,
        column: "a",
        candidateValues: ["x"],
      }),
    ).toBeUndefined();
  });
});
