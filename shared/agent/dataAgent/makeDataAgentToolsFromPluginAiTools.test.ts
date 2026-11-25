import { describe, expect, it } from "vitest";
import {
  makeDataAgentToolLabelFromName,
  makeDataAgentToolsFromPluginAiTools,
} from "$/agent/dataAgent/makeDataAgentToolsFromPluginAiTools.ts";
import type { PluginAiToolDeclaration } from "$/agent/dataAgent/pluginAiTools.types.ts";

const FIT_REGRESSION_DECLARATION: PluginAiToolDeclaration = {
  pluginId: "avandar.regression",
  permissions: ["data:context"],
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

describe("makeDataAgentToolsFromPluginAiTools", () => {
  it("labels fitRegression as Fit regression", () => {
    const [tool] = makeDataAgentToolsFromPluginAiTools([
      FIT_REGRESSION_DECLARATION,
    ]);
    expect(tool?.label).toBe("Fit regression");
    expect(tool?.name).toBe("fitRegression");
    expect(tool?.description).toBe(FIT_REGRESSION_DECLARATION.description);
  });

  it("makes required properties required and others optional", () => {
    const [tool] = makeDataAgentToolsFromPluginAiTools([
      {
        ...FIT_REGRESSION_DECLARATION,
        parameters: {
          ...FIT_REGRESSION_DECLARATION.parameters,
          required: ["xColumn"],
        },
      },
    ]);
    expect(tool?.parameters.required).toEqual(["xColumn"]);
  });

  it("compiles every property type, including a number enum", () => {
    expect(() => {
      return makeDataAgentToolsFromPluginAiTools([
        {
          ...FIT_REGRESSION_DECLARATION,
          parameters: {
            type: "object",
            additionalProperties: false,
            required: [],
            properties: {
              degree: { type: "number", enum: [1, 2] },
              ratio: { type: "number" },
              mode: { type: "string", enum: ["fast", "exact"] },
              isRobust: { type: "boolean" },
            },
          },
        },
      ]);
    }).not.toThrow();
  });
});

describe("makeDataAgentToolLabelFromName", () => {
  it("capitalises the first letter and spaces later capitals", () => {
    expect(makeDataAgentToolLabelFromName("fitRegression")).toBe(
      "Fit regression",
    );
    expect(makeDataAgentToolLabelFromName("runKMeansCluster")).toBe(
      "Run k means cluster",
    );
  });
});
