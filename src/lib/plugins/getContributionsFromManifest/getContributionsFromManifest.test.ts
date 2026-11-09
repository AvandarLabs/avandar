import { describe, expect, it } from "vitest";
import { getContributionsFromManifest } from "@/lib/plugins/getContributionsFromManifest/getContributionsFromManifest";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

function _makeManifest(
  contributes: Partial<PluginManifest["contributes"]>,
): PluginManifest {
  return {
    contributes: { commands: [], menus: {}, vizTypes: [], ...contributes },
  } as unknown as PluginManifest;
}

const REGRESSION_COMMAND = {
  id: "regression.linear",
  title: "%regression.linear.title%",
  icon: "trending-up",
};
const SUMMARY_COMMAND = {
  id: "summary",
  title: "%summary.title%",
  icon: "chart-dots",
};

describe("getContributionsFromManifest", () => {
  it("lists the Data Explorer toolbar commands in menu order with their titles", () => {
    const manifest = _makeManifest({
      commands: [REGRESSION_COMMAND, SUMMARY_COMMAND],
      menus: {
        "dataExplorer.toolbar": [
          { command: "summary" },
          { command: "regression.linear" },
        ],
      },
    });

    expect(
      getContributionsFromManifest(manifest).dataExplorerToolbarCommands,
    ).toEqual([
      { id: "summary", title: "%summary.title%" },
      { id: "regression.linear", title: "%regression.linear.title%" },
    ]);
  });

  it("lists a toolbar command once when the menu names it twice", () => {
    const manifest = _makeManifest({
      commands: [REGRESSION_COMMAND],
      menus: {
        "dataExplorer.toolbar": [
          { command: "regression.linear" },
          { command: "regression.linear" },
        ],
      },
    });

    expect(
      getContributionsFromManifest(manifest).dataExplorerToolbarCommands,
    ).toEqual([
      { id: "regression.linear", title: "%regression.linear.title%" },
    ]);
  });

  it("leaves out a toolbar entry whose command the manifest does not declare", () => {
    const manifest = _makeManifest({
      commands: [REGRESSION_COMMAND],
      menus: {
        "dataExplorer.toolbar": [
          { command: "missing" },
          { command: "regression.linear" },
        ],
      },
    });

    expect(
      getContributionsFromManifest(manifest).dataExplorerToolbarCommands,
    ).toEqual([
      { id: "regression.linear", title: "%regression.linear.title%" },
    ]);
  });

  it("lists the chart types with their titles", () => {
    const manifest = _makeManifest({
      vizTypes: [
        { id: "epicurve", title: "%viz.epicurve.title%" },
        { id: "rate-plot", title: "%viz.ratePlot.title%" },
      ] as unknown as PluginManifest["contributes"]["vizTypes"],
    });

    expect(getContributionsFromManifest(manifest).chartTypes).toEqual([
      { id: "epicurve", title: "%viz.epicurve.title%" },
      { id: "rate-plot", title: "%viz.ratePlot.title%" },
    ]);
  });

  it("lists nothing when the manifest contributes nothing", () => {
    expect(getContributionsFromManifest(_makeManifest({}))).toEqual({
      dataExplorerToolbarCommands: [],
      chartTypes: [],
    });
  });
});
