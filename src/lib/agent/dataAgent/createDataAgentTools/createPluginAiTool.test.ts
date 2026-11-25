import { describe, expect, it, vi } from "vitest";
import { createPluginAiTool } from "@/lib/agent/dataAgent/createDataAgentTools/createPluginAiTool";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types";

const FIT_DECLARATION: PluginAiToolDeclaration = {
  pluginId: "avandar.epidemiology",
  permissions: ["data:read"],
  name: "fitRegression",
  description: "Fits a line to two numeric columns.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["xColumn"],
    properties: { xColumn: { type: "string" } },
  },
};

describe("createPluginAiTool", () => {
  it("runs the declaration with the model's arguments and returns its text", async () => {
    const runPluginAiTool = vi
      .fn()
      .mockResolvedValue({ text: '{"slope":2}', isError: false });
    const tool = createPluginAiTool({
      declaration: FIT_DECLARATION,
      runPluginAiTool,
    });

    const result = await tool.execute("call-1", { xColumn: "week" });

    expect(tool.name).toBe("fitRegression");
    expect(tool.label).toBe("Fit regression");
    expect(runPluginAiTool).toHaveBeenCalledWith({
      declaration: FIT_DECLARATION,
      args: { xColumn: "week" },
    });
    expect(result.content).toEqual([{ type: "text", text: '{"slope":2}' }]);
    expect(result.isError).toBe(false);
    expect(result.terminate).toBeUndefined();
  });

  it("marks a failed run as an error result", async () => {
    const tool = createPluginAiTool({
      declaration: FIT_DECLARATION,
      runPluginAiTool: vi
        .fn()
        .mockResolvedValue({ text: "The tool failed.", isError: true }),
    });

    const result = await tool.execute("call-1", { xColumn: "week" });

    expect(result.content).toEqual([
      { type: "text", text: "The tool failed." },
    ]);
    expect(result.isError).toBe(true);
  });
});
