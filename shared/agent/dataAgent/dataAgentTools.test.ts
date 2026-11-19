import { RESERVED_AI_TOOL_NAMES } from "@avandar/plugin-manifest";
import { describe, expect, it } from "vitest";
import {
  ADD_DASHBOARD_BLOCK_TOOL,
  DATA_AGENT_PROMPT_IDS,
  DATA_AGENT_TOOLS,
  DATA_AGENT_TOOLS_BY_PROMPT_ID,
} from "$/agent/dataAgent/dataAgentTools.ts";

function _namesOf(promptId: (typeof DATA_AGENT_PROMPT_IDS)[number]): string[] {
  return DATA_AGENT_TOOLS_BY_PROMPT_ID[promptId].map((tool) => {
    return tool.name;
  });
}

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

  it("reserves every built-in tool any prompt version serves", () => {
    const servedNames = Object.values(DATA_AGENT_TOOLS_BY_PROMPT_ID).flatMap(
      (tools) => {
        return tools.map((tool) => {
          return tool.name;
        });
      },
    );

    expect(RESERVED_AI_TOOL_NAMES).toEqual(expect.arrayContaining(servedNames));
  });
});

describe("DATA_AGENT_TOOLS_BY_PROMPT_ID", () => {
  it.each([
    "data-agent-v1",
    "data-agent-v2",
    "data-agent-v3",
    "data-agent-v4",
    "data-agent-v5",
  ] as const)("keeps %s on the three built-in tools", (promptId) => {
    const threeTools = DATA_AGENT_TOOLS.map((tool) => {
      return tool.name;
    });

    expect(_namesOf(promptId)).toEqual(threeTools);
    expect(_namesOf(promptId)).not.toContain(ADD_DASHBOARD_BLOCK_TOOL.name);
  });

  it("gives v6 the dashboard tool last", () => {
    expect(_namesOf("data-agent-v6")).toEqual([
      "run_query",
      "lookup_values",
      "ask_user",
      ADD_DASHBOARD_BLOCK_TOOL.name,
    ]);
  });

  it("lists a tool list for every served version", () => {
    expect(Object.keys(DATA_AGENT_TOOLS_BY_PROMPT_ID).sort()).toEqual(
      [...DATA_AGENT_PROMPT_IDS].sort(),
    );
  });
});
