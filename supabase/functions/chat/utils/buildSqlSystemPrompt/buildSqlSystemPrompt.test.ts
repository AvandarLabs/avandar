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

  it("lists concept aliases and attribute names without concept UUIDs", () => {
    const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const prompt = buildSqlSystemPrompt({
      prompt: "count cases",
      datasets: [],
      columns: [],
      concepts: [{ id: conceptId, name: "Case" }],
      conceptAttributes: [{ concept_id: conceptId, name: "status" }],
    });

    expect(prompt).toContain("- c0: Case (status)");
    expect(prompt).toContain("c0, c1");
    expect(prompt).not.toContain(conceptId);
  });

  it("lists a case type's allowed statuses in the schema block", () => {
    const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const prompt = buildSqlSystemPrompt({
      prompt: "how many confirmed cases",
      datasets: [],
      columns: [],
      concepts: [{ id: conceptId, name: "Cholera case" }],
      conceptAttributes: [{ concept_id: conceptId, name: "district" }],
      conceptStatuses: [
        { concept_id: conceptId, name: "Suspected", position: 0 },
        { concept_id: conceptId, name: "Confirmed", position: 1 },
      ],
    });

    expect(prompt).toContain(
      "- c0: Cholera case (district, status: Suspected | Confirmed)",
    );
  });

  it("marks a list field and explains list SQL", () => {
    const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const prompt = buildSqlSystemPrompt({
      prompt: "which cases had a rash",
      datasets: [],
      columns: [],
      concepts: [{ id: conceptId, name: "Measles case" }],
      conceptAttributes: [
        { concept_id: conceptId, name: "Symptoms", is_array: true },
      ],
    });

    expect(prompt).toContain("- c0: Measles case (Symptoms (list))");
    expect(prompt).toContain('UNNEST("field")');
  });

  it("leaves the list note out when no field is a list", () => {
    const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const prompt = buildSqlSystemPrompt({
      prompt: "how many cases",
      datasets: [],
      columns: [],
      concepts: [{ id: conceptId, name: "Case" }],
      conceptAttributes: [{ concept_id: conceptId, name: "age" }],
    });

    expect(prompt).not.toContain("list_contains");
  });

  it("lists a field under the column name SQL must use", () => {
    const conceptId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const prompt = buildSqlSystemPrompt({
      prompt: "list case ids",
      datasets: [],
      columns: [],
      concepts: [{ id: conceptId, name: "Case" }],
      conceptAttributes: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          concept_id: conceptId,
          name: "external_id",
        },
      ],
    });

    expect(prompt).toContain(
      '- c0: Case (external_id_2 (field "external_id"))',
    );
  });

  it("marks a per-month field and explains how to unnest it", () => {
    const prompt = buildSqlSystemPrompt({
      prompt: "average temperature per month",
      datasets: [],
      columns: [],
      concepts: [{ id: "concept-visits", name: "Patient" }],
      conceptAttributes: [
        {
          concept_id: "concept-visits",
          name: "Temperature",
          is_array: true,
          bucket_grain: "month",
          data_type: "double",
        },
      ],
    });

    expect(prompt).toContain(
      "Temperature [per month: STRUCT(bucket DATE, value DOUBLE)[]]",
    );
    expect(prompt).toContain('UNNEST(c."Temperature") AS p(entry)');
    expect(prompt).not.toContain("Temperature (list)");
  });
});
