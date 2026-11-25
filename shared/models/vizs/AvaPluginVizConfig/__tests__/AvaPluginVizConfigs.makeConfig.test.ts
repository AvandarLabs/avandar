import { describe, expect, it } from "vitest";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type { PluginVizSettingShape } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

const REGION_ID = "region-id" as QueryColumn.Id;
const ONSET_ID = "onset-id" as QueryColumn.Id;
const REPORTED_ID = "reported-id" as QueryColumn.Id;
const COLUMNS: readonly QueryResult.ColumnWithId[] = [
  { id: REGION_ID, name: "region", dataType: "varchar" },
  { id: ONSET_ID, name: "onset_date", dataType: "date" },
  { id: REPORTED_ID, name: "reported_at", dataType: "timestamp" },
];

function _makeConfigFromSettings(
  settings: readonly PluginVizSettingShape[],
): ReturnType<typeof AvaPluginVizConfigs.makeConfig> {
  return AvaPluginVizConfigs.makeConfig({
    pluginId: "avandar.epidemiology",
    pluginVizId: "epicurve",
    settings,
    columns: COLUMNS,
  });
}

describe("AvaPluginVizConfigs.makeConfig", () => {
  it("names the plugin and chart type it was built for", () => {
    expect(_makeConfigFromSettings([])).toEqual({
      vizType: "plugin",
      pluginId: "avandar.epidemiology",
      pluginVizId: "epicurve",
      columnSettings: {},
      settings: {},
    });
  });

  it("fills a required column picker with the first column of its data type", () => {
    const config = _makeConfigFromSettings([
      {
        key: "date",
        required: true,
        control: { kind: "columnPicker", dataType: "temporal" },
      },
    ]);
    expect(config.columnSettings).toEqual({ date: ONSET_ID });
  });

  it("fills a required column picker with no data type from the first column", () => {
    const config = _makeConfigFromSettings([
      { key: "stack", required: true, control: { kind: "columnPicker" } },
    ]);
    expect(config.columnSettings).toEqual({ stack: REGION_ID });
  });

  it("leaves a required column picker unset when no column has its data type", () => {
    const config = _makeConfigFromSettings([
      {
        key: "count",
        required: true,
        control: { kind: "columnPicker", dataType: "numeric" },
      },
    ]);
    expect(config.columnSettings.count).toBeUndefined();
  });

  it("leaves an optional column picker unset when a column has its data type", () => {
    const config = _makeConfigFromSettings([
      {
        key: "lower",
        required: false,
        control: { kind: "columnPicker", dataType: "temporal" },
      },
    ]);
    expect(config.columnSettings.lower).toBeUndefined();
  });

  it("starts each non-column setting at its default", () => {
    const config = _makeConfigFromSettings([
      {
        key: "interval",
        required: true,
        default: "epiWeek",
        control: { kind: "segmented" },
      },
      {
        key: "maxSeries",
        required: false,
        default: 8,
        control: { kind: "number" },
      },
    ]);
    expect(config.settings).toEqual({ interval: "epiWeek", maxSeries: 8 });
  });

  it("leaves a non-column setting with no default unset", () => {
    const config = _makeConfigFromSettings([
      { key: "title", required: false, control: { kind: "text" } },
    ]);
    expect(config.settings.title).toBeUndefined();
  });
});
