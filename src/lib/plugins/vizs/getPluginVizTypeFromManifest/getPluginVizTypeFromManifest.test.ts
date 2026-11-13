import { describe, expect, it } from "vitest";
import { getPluginVizTypeFromManifest } from "@/lib/plugins/vizs/getPluginVizTypeFromManifest/getPluginVizTypeFromManifest";
import type {
  PluginManifest,
  PluginVizType,
} from "@avandar/plugin-manifest/runtime";

const EPICURVE: PluginVizType = {
  id: "epicurve",
  title: "%viz.epicurve.title%",
  icon: "chart-histogram",
  render: "transform",
  settings: [
    {
      key: "dateColumn",
      label: "%viz.epicurve.dateColumn%",
      control: { kind: "columnPicker", dataType: "temporal" },
      required: true,
    },
  ],
};

const MANIFEST: PluginManifest = {
  id: "avandar.epidemiology",
  name: "%name%",
  description: "%description%",
  version: "1.0.0",
  license: "MIT",
  engines: { avandar: ">=1.0.0" },
  entry: "src/index.tsx",
  icon: "virus",
  permissions: [],
  contributes: { commands: [], menus: {}, vizTypes: [EPICURVE], aiTools: [] },
};

describe("getPluginVizTypeFromManifest", () => {
  it("finds the chart type the manifest declares under the id", () => {
    expect(
      getPluginVizTypeFromManifest({
        manifest: MANIFEST,
        pluginVizId: "epicurve",
      }),
    ).toBe(EPICURVE);
  });

  it("returns undefined for an id the manifest does not declare", () => {
    expect(
      getPluginVizTypeFromManifest({
        manifest: MANIFEST,
        pluginVizId: "rate-plot",
      }),
    ).toBeUndefined();
  });
});
