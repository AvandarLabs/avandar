/**
 * Always-on OpenRouter tool catalog for unified chat sessions.
 */
import { prop } from "@avandar/utils";
import { makeChatToolConfigFromOptions } from "@sbfn/chat/PostChatMessages/prompt/makeChatToolConfigFromOptions.ts";
import { describe, expect, it } from "vitest";

describe("makeChatToolConfigFromOptions", () => {
  it("always advertises clarify, generateSql, and addDashboardBlock in that order", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
    });
    const tools = config.tools as Array<{ function: { name: string } }>;
    expect(tools.map(prop("function.name"))).toEqual([
      "clarify",
      "generateSql",
      "addDashboardBlock",
    ]);
  });

  it("advertises only the case design tools for case-manager", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
      app: "case-manager",
    });
    const tools = config.tools as Array<{ function: { name: string } }>;
    expect(tools.map(prop("function.name"))).toEqual([
      "clarify",
      "proposeCaseType",
      "createCaseTypes",
    ]);
  });

  it("lets proposeCaseType prefill every field of a draft", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
      app: "case-manager",
    });
    const tools = config.tools as Array<{
      function: {
        name: string;
        parameters: { properties: Record<string, unknown> };
      };
    }>;
    const propose = tools.find((tool) => {
      return tool.function.name === "proposeCaseType";
    });

    expect(Object.keys(propose?.function.parameters.properties ?? {})).toEqual([
      "name",
      "description",
      "allowManualCreation",
      "sourceDatasets",
      "labelColumnId",
      "attributes",
      "manualEntryAttributes",
    ]);
  });

  it("lets proposeCaseType name several source datasets with join keys", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
      app: "case-manager",
    });
    const tools = config.tools as Array<{
      function: {
        name: string;
        parameters: {
          properties: {
            sourceDatasets?: {
              type: string;
              items: { required: string[] };
            };
            attributes?: { items: { required: string[] } };
          };
        };
      };
    }>;
    const propose = tools.find((tool) => {
      return tool.function.name === "proposeCaseType";
    });
    const { sourceDatasets, attributes } = propose!.function.parameters
      .properties;

    // An array, so a case type is never confined to a single dataset, and each
    // entry must carry its own join key or the concept cannot be built.
    expect(sourceDatasets?.type).toBe("array");
    expect(sourceDatasets?.items.required).toEqual([
      "datasetId",
      "primaryKeyColumnId",
    ]);
    // Each attribute must say which source it reads from.
    expect(attributes?.items.required).toContain("datasetId");
  });

  it("tells generateSql and DataViz to use schema aliases, not dataset ids", () => {
    const config = makeChatToolConfigFromOptions({
      clarificationCapReached: false,
    });
    const tools = config.tools as Array<{
      function: {
        name: string;
        parameters: { properties: { sql?: { description: string } } };
      };
    }>;
    const generateSql = tools.find((tool) => {
      return tool.function.name === "generateSql";
    });
    const dashboard = tools.find((tool) => {
      return tool.function.name === "addDashboardBlock";
    });
    expect(
      generateSql?.function.parameters.properties.sql?.description,
    ).toContain("aliases");
    expect(
      dashboard?.function.parameters.properties.sql?.description,
    ).toContain("aliases");
    expect(
      dashboard?.function.parameters.properties.sql?.description,
    ).not.toContain("dataset ids");
  });
});
