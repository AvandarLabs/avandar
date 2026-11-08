import { prop } from "@avandar/utils";
import { useMemo } from "react";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs";
import { AvaVizConfigs } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import { PluginVizChartLoader } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizChartLoader";
import { PluginVizCodeLoader } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizCodeLoader";
import { PluginVizMissingSettings } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizMissingSettings";
import { PLUGIN_VIZ_COMPONENT_ROW_LIMIT } from "@/lib/plugins/vizs/PluginVizRenderer/PluginVizRenderer.constants";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { UiPluginVizConfig } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { PluginVizTypeLookup } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";
import type { PluginVizInput } from "@avandar/plugin-sdk";
import type { UnknownDataFrame } from "@avandar/utils";

type Props = {
  lookup: Extract<PluginVizTypeLookup, { status: "ready" }>;
  columns: readonly QueryResult.ColumnWithId[];
  rawColumns: readonly QueryResult.Column[];
  data: UnknownDataFrame;
  vizConfig: AvaVizConfig.Plugin;
  isTruncated: boolean;
};

/** What a plugin chart's input is built from. */
type InputSource = {
  vizType: PluginVizType;
  uiConfig: UiPluginVizConfig;
  data: UnknownDataFrame;
  rawColumns: readonly QueryResult.Column[];
  isTruncated: boolean;
};

/** Numbers each result's rows by identity, for the chart's remount key. */
const dataKeys = new WeakMap<UnknownDataFrame, number>();
let lastDataKey = 0;

function _getChartKeyFromInput(options: {
  lookup: Props["lookup"];
  data: UnknownDataFrame;
  settings: PluginVizInput["settings"];
}): string {
  const { lookup, data, settings } = options;
  // A caller can pass a fresh empty array on every render, so every empty
  // result shares one key instead of remounting the chart each time.
  let dataKey = data.length === 0 ? 0 : dataKeys.get(data);
  if (dataKey === undefined) {
    lastDataKey += 1;
    dataKey = lastDataKey;
    dataKeys.set(data, dataKey);
  }
  return JSON.stringify([
    lookup.entry.id,
    lookup.vizType.id,
    dataKey,
    settings,
  ]);
}

function _getMissingSettings(options: {
  vizType: PluginVizType;
  uiConfig: UiPluginVizConfig;
  rawColumns: readonly QueryResult.Column[];
}): PluginVizType["settings"] {
  const { vizType, uiConfig, rawColumns } = options;
  const missingKeys = AvaPluginVizConfigs.getMissingRequiredKeys({
    config: uiConfig,
    settings: vizType.settings,
    columnNames: rawColumns.map(prop("name")),
  });
  return vizType.settings.filter((setting) => {
    return missingKeys.includes(setting.key);
  });
}

function _getUiPluginVizConfig(options: {
  vizConfig: AvaVizConfig.Plugin;
  columns: readonly QueryResult.ColumnWithId[];
}): UiPluginVizConfig {
  const { vizConfig, columns } = options;
  const { config } = AvaVizConfigs.toUiVizConfig({
    config: vizConfig,
    columns,
  });
  // The conversion keeps the viz type, so a plugin config always comes back
  // as one. The other arm only satisfies the union.
  return config.vizType === "plugin"
    ? config
    : { ...vizConfig, columnSettings: {} };
}

function _getSettingsFromUiConfig(options: {
  vizType: PluginVizType;
  uiConfig: UiPluginVizConfig;
}): PluginVizInput["settings"] {
  const { vizType, uiConfig } = options;
  return Object.fromEntries(
    vizType.settings.map((setting) => {
      return [
        setting.key,
        setting.control.kind === "columnPicker"
          ? uiConfig.columnSettings[setting.key]
          : uiConfig.settings[setting.key],
      ] as const;
    }),
  );
}

function _makeInputFromSource(source: Readonly<InputSource>): PluginVizInput {
  const { vizType, uiConfig, data, rawColumns, isTruncated } = source;
  const rows =
    vizType.render === "component"
      ? data.slice(0, PLUGIN_VIZ_COMPONENT_ROW_LIMIT)
      : data;
  return {
    rows,
    columns: rawColumns.map((column) => {
      return { name: column.name, dataType: column.dataType };
    }),
    settings: _getSettingsFromUiConfig({ vizType, uiConfig }),
    isTruncated: isTruncated || rows.length < data.length,
  };
}

/**
 * A plugin chart whose type was found: it reads the stored config by column
 * name, asks for any required setting that has no value (a column setting
 * also counts as missing when the result's columns lack it), and otherwise
 * builds the chart's input (column settings as column names, and at most
 * `PLUGIN_VIZ_COMPONENT_ROW_LIMIT` rows for a component chart) and loads the
 * chart. Until the result has columns, no stored column can be found by
 * name, so it shows the chart loader instead of asking for settings or
 * running plugin code. The chart remounts when its plugin, chart type,
 * settings, or result rows change, so a chart that crashed draws again
 * instead of keeping its error state. `PluginVizRenderer` renders it.
 */
export function PluginVizConfiguredChart({
  lookup,
  columns,
  rawColumns,
  data,
  vizConfig,
  isTruncated,
}: Props): JSX.Element {
  const { vizType } = lookup;
  const uiConfig = useMemo(() => {
    return _getUiPluginVizConfig({ vizConfig, columns });
  }, [vizConfig, columns]);
  const input = useMemo(() => {
    return _makeInputFromSource({
      vizType,
      uiConfig,
      data,
      rawColumns,
      isTruncated,
    });
  }, [vizType, uiConfig, data, rawColumns, isTruncated]);
  if (rawColumns.length === 0) {
    return <PluginVizChartLoader />;
  }
  const missingSettings = _getMissingSettings({
    vizType,
    uiConfig,
    rawColumns,
  });
  if (missingSettings.length > 0) {
    return (
      <PluginVizMissingSettings
        settings={missingSettings}
        strings={lookup.manifestModule.strings}
      />
    );
  }
  return (
    <PluginVizCodeLoader
      key={_getChartKeyFromInput({ lookup, data, settings: input.settings })}
      lookup={lookup}
      input={input}
    />
  );
}
