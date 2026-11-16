import { describe, expect, it } from "vitest";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type {
  PluginVizSettingShape,
  UiPluginVizConfig,
} from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

const SETTINGS: readonly PluginVizSettingShape[] = [
  {
    key: "date",
    required: true,
    control: { kind: "columnPicker", dataType: "temporal" },
  },
  {
    key: "stack",
    required: false,
    control: { kind: "columnPicker", dataType: "text" },
  },
  { key: "interval", required: true, control: { kind: "segmented" } },
  { key: "title", required: false, control: { kind: "text" } },
];

const UI_CONFIG: UiPluginVizConfig = {
  vizType: "plugin",
  pluginId: "avandar.epidemiology",
  pluginVizId: "epicurve",
  columnSettings: { date: "onset_date", stack: undefined },
  settings: { interval: "epiWeek", title: undefined },
};

describe("AvaPluginVizConfigs.getMissingRequiredKeys", () => {
  it("lists no keys when every required setting is set", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: UI_CONFIG,
        settings: SETTINGS,
        columnNames: ["onset_date", "region"],
      }),
    ).toEqual([]);
  });

  it("lists a required column setting that is unset", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: { ...UI_CONFIG, columnSettings: { date: undefined } },
        settings: SETTINGS,
        columnNames: ["onset_date"],
      }),
    ).toEqual(["date"]);
  });

  it("lists a required column setting whose column the result lacks", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: UI_CONFIG,
        settings: SETTINGS,
        columnNames: ["region"],
      }),
    ).toEqual(["date"]);
  });

  it("accepts a set column setting when no column names are given", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: {
          ...UI_CONFIG,
          columnSettings: { date: "onset-id" as QueryColumn.Id },
        },
        settings: SETTINGS,
        columnNames: undefined,
      }),
    ).toEqual([]);
  });

  it("lists a required non-column setting that is unset", () => {
    expect(
      AvaPluginVizConfigs.getMissingRequiredKeys({
        config: { ...UI_CONFIG, settings: { interval: undefined } },
        settings: SETTINGS,
        columnNames: ["onset_date"],
      }),
    ).toEqual(["interval"]);
  });
});
