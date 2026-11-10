import { afterEach, describe, expect, it } from "vitest";
import { ExplorerPluginResultStore } from "@/lib/plugins/ExplorerPluginResultStore/ExplorerPluginResultStore";
import { FIT_REGRESSION_QUESTIONS } from "../../covid/fitRegressionQuestions";
import {
  getEvalPluginAiTools,
  publishFitRegressionResult,
  runEvalPluginAiTool,
} from "./fitRegressionTooling";

const FIT = FIT_REGRESSION_QUESTIONS[0]!.fitRegression!;

afterEach(() => {
  ExplorerPluginResultStore.clear();
});

describe("getEvalPluginAiTools", () => {
  it("offers no tool until a result is published", () => {
    expect(getEvalPluginAiTools()).toEqual([]);
  });

  it("offers fitRegression once a result is published", () => {
    publishFitRegressionResult(FIT);

    expect(
      getEvalPluginAiTools().map((declaration) => {
        return declaration.name;
      }),
    ).toEqual(["fitRegression"]);
  });
});

describe("runEvalPluginAiTool", () => {
  it("fits the published rows with the plugin's handler", async () => {
    publishFitRegressionResult(FIT);
    const [declaration] = getEvalPluginAiTools();

    const outcome = await runEvalPluginAiTool({
      declaration: declaration!,
      args: { xColumn: "x", yColumn: "y" },
    });

    expect(outcome.isError).toBe(false);
    expect(JSON.parse(outcome.text)).toMatchObject({
      slope: expect.closeTo(2),
      n: 5,
    });
  });
});
