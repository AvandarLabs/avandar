import { describe, expect, it } from "vitest";
import { isPluginVizConfigReadable } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { PluginVizSetting } from "@avandar/plugin-manifest/runtime";

const FIELDS: readonly QueryResult.ColumnWithId[] = [
  { id: "region-id" as QueryColumn.Id, name: "region", dataType: "varchar" },
];

function _makeConfig(options: {
  columnSettings: Record<string, string>;
  settings: Record<string, unknown>;
}): unknown {
  return {
    vizType: "plugin",
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    ...options,
  };
}

describe("isPluginVizConfigReadable", () => {
  it("reads a text setting keyed like an Object member that has no stored value", () => {
    const settings: PluginVizSetting[] = [
      {
        key: "toString",
        label: "%viz.label%",
        control: { kind: "text" },
      } as PluginVizSetting,
    ];
    const config = _makeConfig({ columnSettings: {}, settings: {} });

    expect(
      isPluginVizConfigReadable({ config, settings, fields: FIELDS }),
    ).toBe(true);
  });

  it("reads a column setting keyed like an Object member that has no stored column", () => {
    const settings: PluginVizSetting[] = [
      {
        key: "valueOf",
        label: "%viz.label%",
        control: { kind: "columnPicker", dataType: "any" },
      } as PluginVizSetting,
    ];
    const config = _makeConfig({ columnSettings: {}, settings: {} });

    expect(
      isPluginVizConfigReadable({ config, settings, fields: FIELDS }),
    ).toBe(true);
  });

  it("still reads a stored value under a key named like an Object member", () => {
    const settings: PluginVizSetting[] = [
      {
        key: "constructor",
        label: "%viz.label%",
        control: { kind: "text" },
      } as PluginVizSetting,
    ];
    const config = _makeConfig({
      columnSettings: {},
      settings: Object.fromEntries([["constructor", "abc"]]),
    });

    expect(
      isPluginVizConfigReadable({ config, settings, fields: FIELDS }),
    ).toBe(true);
  });
});
