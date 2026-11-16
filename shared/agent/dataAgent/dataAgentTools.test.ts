import { RESERVED_AI_TOOL_NAMES } from "@avandar/plugin-manifest";
import { describe, expect, it } from "vitest";
import { DATA_AGENT_TOOLS } from "$/agent/dataAgent/dataAgentTools.ts";

describe("DATA_AGENT_TOOLS", () => {
  it("lists only names that RESERVED_AI_TOOL_NAMES reserves, so no plugin tool can take one", () => {
    expect(RESERVED_AI_TOOL_NAMES).toEqual(
      expect.arrayContaining(
        DATA_AGENT_TOOLS.map((tool) => {
          return tool.name;
        }),
      ),
    );
  });
});
