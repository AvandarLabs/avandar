/**
 * getOfflineDatasetFromPrompt maps a question, open dataset, or analyze alias
 * onto one workspace dataset.
 */
import { describe, expect, it } from "vitest";

import { getOfflineDatasetFromPrompt } from "@/components/ChatPanel/offlineChatHelpers/getOfflineDatasetFromPrompt/getOfflineDatasetFromPrompt";

const SCHEMA = {
  datasets: [
    { id: "id-deaths", name: "LONG_us_deaths.csv" },
    { id: "id-cases", name: "LONG_us_confirmed_cases.csv" },
  ],
  columns: [],
} as const;

describe("getOfflineDatasetFromPrompt", () => {
  it("prefers deaths file for covid deaths prompt", () => {
    const dataset = getOfflineDatasetFromPrompt({
      schema: SCHEMA,
      lastUserPrompt: "get top 100 rows from covid deaths dataset",
    });
    expect(dataset?.id).toBe("id-deaths");
  });

  it("maps analyze tableName aliases to workspace datasets", () => {
    const dataset = getOfflineDatasetFromPrompt({
      schema: SCHEMA,
      lastUserPrompt: "anything",
      analyzeTableName: "t0",
    });
    expect(dataset?.id).toBe("id-cases");
  });

  it("uses analyze tableName when valid", () => {
    const dataset = getOfflineDatasetFromPrompt({
      schema: SCHEMA,
      lastUserPrompt: "anything",
      analyzeTableName: "id-cases",
    });
    expect(dataset?.id).toBe("id-cases");
  });

  it("maps analyze tableName hallucinations to workspace datasets", () => {
    const dataset = getOfflineDatasetFromPrompt({
      schema: SCHEMA,
      lastUserPrompt: "top 100",
      analyzeTableName: "covid_deaths",
    });
    expect(dataset?.id).toBe("id-deaths");
  });

  it("falls back to open dataset when prompt is vague", () => {
    const dataset = getOfflineDatasetFromPrompt({
      schema: SCHEMA,
      lastUserPrompt: "show me data",
      openDatasetId: "id-cases",
    });
    expect(dataset?.id).toBe("id-cases");
  });

  it("uses fuse when token heuristics are too weak", () => {
    const dataset = getOfflineDatasetFromPrompt({
      schema: SCHEMA,
      lastUserPrompt: "get rows from long_us_deths",
    });
    expect(dataset?.id).toBe("id-deaths");
  });
});
