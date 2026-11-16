import { makeObject, prop } from "@avandar/utils";
import { doesDataTypeMatchColumnPicker } from "$/models/vizs/doesDataTypeMatchColumnPicker/doesDataTypeMatchColumnPicker.ts";
import type { QueryColumn } from "$/models/queries/QueryColumn/QueryColumn.ts";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult.ts";
import type {
  AvaPluginVizConfig,
  PluginVizSettingShape,
  UiPluginVizConfig,
} from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfig.types.ts";

function _isColumnSetting(setting: PluginVizSettingShape): boolean {
  return setting.control.kind === "columnPicker";
}

function _getFirstMatchingColumnId(
  options: Readonly<{
    setting: PluginVizSettingShape;
    columns: readonly QueryResult.ColumnWithId[];
  }>,
): QueryColumn.Id | undefined {
  const { setting, columns } = options;
  return columns.find((column) => {
    return doesDataTypeMatchColumnPicker({
      dataType: column.dataType,
      pickerDataType: setting.control.dataType,
    });
  })?.id;
}

function _isRequiredSettingMissing(
  options: Readonly<{
    setting: PluginVizSettingShape;
    config: AvaPluginVizConfig | UiPluginVizConfig;
    columnNames: readonly string[] | undefined;
  }>,
): boolean {
  const { setting, config, columnNames } = options;
  if (!_isColumnSetting(setting)) {
    return config.settings[setting.key] === undefined;
  }
  const column = config.columnSettings[setting.key];
  return (
    column === undefined ||
    (columnNames !== undefined && !columnNames.includes(column))
  );
}

/**
 * Builds and checks plugin chart configs from the settings a plugin's
 * manifest declares for the chart type. Use it wherever a plugin chart is
 * picked or drawn, for example when a user picks a plugin chart type.
 */
export const AvaPluginVizConfigs = {
  /**
   * Builds a plugin chart config from its manifest settings and the current
   * result columns. Each setting starts at its `default`. A required column
   * picker takes the first column whose data type it accepts. An optional
   * column picker starts unset, so one column is never bound to several
   * roles.
   */
  makeConfig: (
    options: Readonly<{
      pluginId: string;
      pluginVizId: string;
      settings: readonly PluginVizSettingShape[];
      columns: readonly QueryResult.ColumnWithId[];
    }>,
  ): AvaPluginVizConfig => {
    const { pluginId, pluginVizId, settings, columns } = options;
    return {
      vizType: "plugin",
      pluginId,
      pluginVizId,
      columnSettings: makeObject(settings.filter(_isColumnSetting), {
        key: "key",
        valueFn: (setting) => {
          return setting.required
            ? _getFirstMatchingColumnId({ setting, columns })
            : undefined;
        },
      }),
      settings: makeObject(
        settings.filter((setting) => {
          return !_isColumnSetting(setting);
        }),
        {
          key: "key",
          valueFn: (setting) => {
            return setting.default;
          },
        },
      ),
    };
  },

  /**
   * Lists the keys of required settings the config leaves unset, so a chart
   * can ask for them instead of drawing. When `columnNames` is given, a
   * required column setting whose column name is not among them is missing
   * too. Pass it with a `UiPluginVizConfig`, whose column settings hold
   * names.
   */
  getMissingRequiredKeys: (
    options: Readonly<{
      config: AvaPluginVizConfig | UiPluginVizConfig;
      settings: readonly PluginVizSettingShape[];
      columnNames: readonly string[] | undefined;
    }>,
  ): string[] => {
    const { config, settings, columnNames } = options;
    return settings
      .filter((setting) => {
        return (
          setting.required &&
          _isRequiredSettingMissing({ setting, config, columnNames })
        );
      })
      .map(prop("key"));
  },
};
