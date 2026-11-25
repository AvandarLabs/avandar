import { describe, expect, it } from "vitest";
import { getActivePluginAiToolsFromInstallations } from "$/agent/dataAgent/getActivePluginAiToolsFromInstallations.ts";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types.ts";

const EPIDEMIOLOGY_TOOL: PluginAiToolDeclaration = {
  pluginId: "avandar.epidemiology",
  permissions: ["data:context", "query:addColumns"],
  name: "fitRegression",
  description: "Fits a regression line through two columns.",
  parameters: {
    type: "object",
    additionalProperties: false,
    required: ["xColumn", "yColumn"],
    properties: {
      xColumn: { type: "string", description: "The predictor column." },
      yColumn: { type: "string", description: "The response column." },
    },
  },
};

describe("getActivePluginAiToolsFromInstallations", () => {
  it("drops a disabled install and an install missing a permission", () => {
    const active = getActivePluginAiToolsFromInstallations({
      tools: [EPIDEMIOLOGY_TOOL],
      installations: [
        {
          pluginId: "avandar.epidemiology",
          isEnabled: false,
          grantedPermissions: ["data:context", "query:addColumns"],
        },
      ],
    });
    expect(active).toEqual([]);
    const pending = getActivePluginAiToolsFromInstallations({
      tools: [EPIDEMIOLOGY_TOOL],
      installations: [
        {
          pluginId: "avandar.epidemiology",
          isEnabled: true,
          grantedPermissions: ["data:context"],
        },
      ],
    });
    expect(pending).toEqual([]);
  });

  it("keeps the tool of an enabled install that granted every permission", () => {
    const active = getActivePluginAiToolsFromInstallations({
      tools: [EPIDEMIOLOGY_TOOL],
      installations: [
        {
          pluginId: "avandar.epidemiology",
          isEnabled: true,
          grantedPermissions: ["data:context", "query:addColumns"],
        },
      ],
    });
    expect(active).toEqual([EPIDEMIOLOGY_TOOL]);
  });

  it("drops a tool whose plugin is not installed", () => {
    const active = getActivePluginAiToolsFromInstallations({
      tools: [EPIDEMIOLOGY_TOOL],
      installations: [
        {
          pluginId: "avandar.hello",
          isEnabled: true,
          grantedPermissions: ["data:context", "query:addColumns"],
        },
      ],
    });
    expect(active).toEqual([]);
  });
});
