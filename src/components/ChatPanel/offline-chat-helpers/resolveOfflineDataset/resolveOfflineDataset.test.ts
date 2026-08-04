import { describe, expect, it } from "vitest";
import { resolveOfflineDataset } from "@/components/ChatPanel/offline-chat-helpers/resolveOfflineDataset/resolveOfflineDataset";

const SCHEMA = {
  datasets: [
    { id: "id-deaths", name: "LONG_us_deaths.csv" },
    { id: "id-cases", name: "LONG_us_confirmed_cases.csv" },
  ],
  columns: [],
} as const;

describe("resolveOfflineDataset", () => {
  it("prefers deaths file for covid deaths prompt", () => {
    const resolved = resolveOfflineDataset({
      schema: SCHEMA,
      lastUserPrompt: "get top 100 rows from covid deaths dataset",
    });
    expect(resolved?.id).toBe("id-deaths");
  });

  it("uses analyze tableName when valid", () => {
    const resolved = resolveOfflineDataset({
      schema: SCHEMA,
      lastUserPrompt: "anything",
      analyzeTableName: "id-cases",
    });
    expect(resolved?.id).toBe("id-cases");
  });

  it("maps analyze tableName hallucinations to workspace datasets", () => {
    const resolved = resolveOfflineDataset({
      schema: SCHEMA,
      lastUserPrompt: "top 100",
      analyzeTableName: "covid_deaths",
    });
    expect(resolved?.id).toBe("id-deaths");
  });

  it("falls back to open dataset when prompt is vague", () => {
    const resolved = resolveOfflineDataset({
      schema: SCHEMA,
      lastUserPrompt: "show me data",
      openDatasetId: "id-cases",
    });
    expect(resolved?.id).toBe("id-cases");
  });

  it("uses fuse when token heuristics are too weak", () => {
    const resolved = resolveOfflineDataset({
      schema: SCHEMA,
      lastUserPrompt: "get rows from long_us_deths",
    });
    expect(resolved?.id).toBe("id-deaths");
  });
});
