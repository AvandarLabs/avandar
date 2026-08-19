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
