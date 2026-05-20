import { describe, expect, it } from "vitest";
import { createMockOfflineChatEngine } from "./createMockOfflineChatEngine";
import { runOfflineChatPipeline } from "./runOfflineChatPipeline";

const SCHEMA = {
  datasets: [{ id: "ds-1", name: "Sales" }],
  columns: [{ dataset_id: "ds-1", name: "amount", data_type: "number" }],
} as const;

describe("runOfflineChatPipeline", () => {
  it("runs analyze then SQL and returns generatedSql", async () => {
    const engine = createMockOfflineChatEngine([
      {
        match: "offline assistant",
        response: '{"summary":"Count sales","proceed":true}',
      },
      {
        match: "DuckDB SQL generator",
        response:
          "Counting rows.\n```sql\nSELECT COUNT(*) FROM \"ds-1\"\n```",
      },
    ]);

    const result = await runOfflineChatPipeline({
      engine,
      schema: SCHEMA,
      pageContext: { app: "data-explorer", openDatasetId: "ds-1" },
      messages: [{ role: "user", content: "How many rows?" }],
      lastUserPrompt: "How many rows?",
    });

    expect(result.generatedSql?.sql).toContain("SELECT COUNT");
    expect(result.clarification).toBeUndefined();
  });

  it("returns clarification when analyze does not proceed", async () => {
    const engine = createMockOfflineChatEngine([
      {
        match: "offline assistant",
        response:
          '{"summary":"Ambiguous","proceed":false,"clarifyQuestion":"Which year?","clarifyOptions":["2023","2024"]}',
      },
    ]);

    const result = await runOfflineChatPipeline({
      engine,
      schema: SCHEMA,
      pageContext: { app: "data-explorer" },
      messages: [{ role: "user", content: "Trends this year" }],
      lastUserPrompt: "Trends this year",
    });

    expect(result.clarification?.question).toBe("Which year?");
    expect(result.generatedSql).toBeUndefined();
  });
});
