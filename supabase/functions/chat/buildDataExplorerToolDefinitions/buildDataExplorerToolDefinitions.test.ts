import { buildDataExplorerToolDefinitions } from "@sbfn/chat/buildDataExplorerToolDefinitions/buildDataExplorerToolDefinitions.ts";
import { describe, expect, it } from "vitest";

describe("buildDataExplorerToolDefinitions", () => {
  it("offers SQL generation and clarification", () => {
    expect(
      buildDataExplorerToolDefinitions().map((tool) => {
        return tool.function.name;
      }),
    ).toEqual(["generateSql", "clarify"]);
  });

  it("stops offering clarification after the turn cap", () => {
    expect(
      buildDataExplorerToolDefinitions(true).map((tool) => {
        return tool.function.name;
      }),
    ).toEqual(["generateSql"]);
  });
});
