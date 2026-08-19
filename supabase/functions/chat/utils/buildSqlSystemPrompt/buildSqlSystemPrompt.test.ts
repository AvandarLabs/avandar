/**
 * The SQL system prompt shows short aliases; dataset UUIDs stay out of the
 * model-facing schema block.
 */
import { buildSqlSystemPrompt } from "@sbfn/chat/utils/buildSqlSystemPrompt/buildSqlSystemPrompt.ts";
import { describe, expect, it } from "vitest";

const CHOLERA_ID = "0f2c9f3e-aaaa-4bbb-8ccc-ddddeeeeffff";

describe("buildSqlSystemPrompt", () => {
  it("lists alias plus columns and never includes dataset UUIDs", () => {
    const prompt = buildSqlSystemPrompt({
      prompt: "count cholera cases",
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
      columns: [
        { dataset_id: CHOLERA_ID, name: "case_id", data_type: "string" },
      ],
    });

    expect(prompt).toContain("- t0: Cholera cases (case_id)");
    expect(prompt).not.toContain(CHOLERA_ID);
    expect(prompt).toContain("SQL FROM / JOIN targets must be the aliases");
  });

  it("keeps the truncated Phase 0 fixture free of dataset UUIDs", () => {
    const datasets = Array.from({ length: 12 }, (_, datasetIndex) => {
      const id = `00000000-0000-4000-8000-${String(datasetIndex).padStart(12, "0")}`;
      return {
        id,
        name: `Dataset ${datasetIndex}`,
      };
    });
    const columns = datasets.flatMap((dataset) => {
      return Array.from({ length: 24 }, (_, columnIndex) => {
        return {
          dataset_id: dataset.id,
          name: `col_${String(columnIndex).padStart(2, "0")}`,
          data_type: "string",
        };
      });
    });
    const prompt = buildSqlSystemPrompt({
      prompt: "preview",
      datasets,
      columns,
    });
    expect(prompt).not.toMatch(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i,
    );
  });

  it("includes spatial docs by default for geospatial prompts", () => {
    const prompt = buildSqlSystemPrompt({
      prompt: "count points near the warehouse",
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
      columns: [
        { dataset_id: CHOLERA_ID, name: "case_id", data_type: "string" },
      ],
    });

    expect(prompt).toContain("Reference documentation");
  });

  it("omits spatial docs when includeSpatialDocumentation is false", () => {
    const prompt = buildSqlSystemPrompt({
      prompt: "count points near the warehouse",
      datasets: [{ id: CHOLERA_ID, name: "Cholera cases" }],
      columns: [
        { dataset_id: CHOLERA_ID, name: "case_id", data_type: "string" },
      ],
      includeSpatialDocumentation: false,
    });

    expect(prompt).not.toContain("Reference documentation");
    expect(prompt).toContain("- t0: Cholera cases (case_id)");
  });
});
