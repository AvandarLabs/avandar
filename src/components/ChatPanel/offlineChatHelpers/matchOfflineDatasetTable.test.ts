/**
 * Concept aliases and concept table names are not datasets; repair must not
 * remap them onto a preferred dataset.
 */
import { describe, expect, it } from "vitest";
import { matchOfflineDatasetTable } from "@/components/ChatPanel/offlineChatHelpers/matchOfflineDatasetTable";

const DEATHS_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const CONCEPT_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("matchOfflineDatasetTable", () => {
  it("does not remap a concept alias onto a preferred dataset", () => {
    const matched = matchOfflineDatasetTable({
      tableRef: "c0",
      datasets: [{ id: DEATHS_ID, name: "LONG_us_deaths.csv" }],
      lastUserPrompt: "cases",
      preferredDatasetId: DEATHS_ID,
      concepts: [{ id: CONCEPT_ID, name: "Case" }],
    });

    expect(matched).toBeUndefined();
  });

  it("does not remap a concept table name onto a preferred dataset", () => {
    const matched = matchOfflineDatasetTable({
      tableRef: `concept_${CONCEPT_ID}`,
      datasets: [{ id: DEATHS_ID, name: "LONG_us_deaths.csv" }],
      lastUserPrompt: "cases",
      preferredDatasetId: DEATHS_ID,
      concepts: [{ id: CONCEPT_ID, name: "Case" }],
    });

    expect(matched).toBeUndefined();
  });
});
