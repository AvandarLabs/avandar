import { getPipelineWorkspaceLoadability } from "@pipelines/shared/getPipelineWorkspaceLoadability/getPipelineWorkspaceLoadability";
import { describe, expect, it } from "vitest";

describe("getPipelineWorkspaceLoadability", () => {
  it("reads the shipped ETL config, which rules out PDF and XLSX", () => {
    const rules = getPipelineWorkspaceLoadability("socrata");

    expect(rules.unloadableFormats).toEqual(
      expect.arrayContaining(["pdf", "xlsx"]),
    );
  });

  it("never rules out the formats the app reads", () => {
    const rules = getPipelineWorkspaceLoadability("hdx");

    expect(rules.unloadableFormats).not.toEqual(
      expect.arrayContaining(["csv"]),
    );
    expect(rules.unloadableFormats).not.toEqual(
      expect.arrayContaining(["parquet"]),
    );
  });
});
