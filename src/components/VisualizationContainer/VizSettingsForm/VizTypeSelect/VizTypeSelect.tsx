import { Select } from "@avandar/ui";
import { useLingui } from "@lingui/react/macro";
import { vizTypeLabel } from "$/copy/vizTypeLabel";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs";
import { VizTypes } from "$/models/vizs/AvaVizConfig/AvaVizConfigs";
import {
  getPluginVizSelectionFromOptionValue,
  makePluginVizOptionValue,
} from "@/lib/plugins/vizs/pluginVizOptionHelpers";
import { usePluginVizOptions } from "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { UiVizConfig } from "$/models/vizs/UiVizConfig/UiVizConfig.types";
import type { PluginVizOption } from "@/lib/plugins/vizs/usePluginVizOptions/usePluginVizOptions";
import type { SelectData, SelectOption } from "@avandar/ui";
import type { ReactNode } from "react";

type Props = {
  /**
   * The active chart config. The selected option is its viz type, or for a
   * plugin chart its plugin chart type.
   */
  vizConfig: AvaVizConfig.T | UiVizConfig;

  /**
   * Columns of the latest query result. A picked plugin chart type fills its
   * required column settings from them.
   */
  columns: readonly QueryResult.ColumnWithId[];

  /**
   * Called with the built-in viz type the user picks, or with the config
   * built for the plugin chart type they pick.
   */
  onChange: (target: AvaVizConfig.BuiltInType | AvaVizConfig.Plugin) => void;

  /** Mantine input size. Defaults to the theme default. */
  size?: string;

  /** Renders the label above the input. Off in compact hosts like a toolbar. */
  withLabel?: boolean;

  className?: string;
};

function _getSelectedValueFromVizConfig(
  vizConfig: Readonly<AvaVizConfig.T | UiVizConfig>,
): string {
  return vizConfig.vizType === "plugin"
    ? makePluginVizOptionValue(vizConfig)
    : vizConfig.vizType;
}

function _makeSelectDataFromPluginVizOptions(options: {
  selectedValue: string;
  pluginVizOptions: readonly PluginVizOption[];
  pluginsGroupLabel: string;
  unlistedPluginChartLabel: string;
}): SelectData<string> {
  const {
    selectedValue,
    pluginVizOptions,
    pluginsGroupLabel,
    unlistedPluginChartLabel,
  } = options;
  const builtInOptions = VizTypes.map((vizType): SelectOption<string> => {
    return { label: vizTypeLabel(vizType), value: vizType };
  });
  const pluginOptions = pluginVizOptions.map((option): SelectOption<string> => {
    return { label: option.label, value: option.value };
  });
  // A chart whose plugin is no longer active stays listed as itself, so the
  // picker never shows a blank type for the chart on screen.
  const isUnlistedPluginChart =
    getPluginVizSelectionFromOptionValue(selectedValue) !== undefined &&
    !pluginOptions.some((option) => {
      return option.value === selectedValue;
    });
  const groupItems = isUnlistedPluginChart
    ? [
        ...pluginOptions,
        { label: unlistedPluginChartLabel, value: selectedValue },
      ]
    : pluginOptions;
  return groupItems.length === 0
    ? builtInOptions
    : [...builtInOptions, { group: pluginsGroupLabel, items: groupItems }];
}

function _makeTargetFromOptionValue(options: {
  optionValue: string | null;
  pluginVizOptions: readonly PluginVizOption[];
  columns: readonly QueryResult.ColumnWithId[];
}): AvaVizConfig.BuiltInType | AvaVizConfig.Plugin | undefined {
  const { optionValue, pluginVizOptions, columns } = options;
  const builtInVizType = VizTypes.find((vizType) => {
    return vizType === optionValue;
  });
  if (builtInVizType !== undefined) {
    return builtInVizType;
  }
  const pluginVizOption = pluginVizOptions.find((option) => {
    return option.value === optionValue;
  });
  return pluginVizOption === undefined
    ? undefined
    : AvaPluginVizConfigs.makeConfig({
        pluginId: pluginVizOption.selection.pluginId,
        pluginVizId: pluginVizOption.selection.pluginVizId,
        settings: pluginVizOption.vizType.settings,
        columns,
      });
}

/**
 * Visualization type picker: the built-in viz types, then a "Plugins" group
 * with the chart types of the workspace's active plugins. Lives outside the
 * settings subforms because the type choice reconfigures every other control,
 * so hosts place it in their own chrome, such as a drawer rail or a chart
 * block's field, rather than inside the form body.
 */
export function VizTypeSelect({
  vizConfig,
  columns,
  onChange,
  size,
  withLabel = true,
  className,
}: Props): ReactNode {
  const { t } = useLingui();
  const pluginVizOptions = usePluginVizOptions();
  const selectedValue = _getSelectedValueFromVizConfig(vizConfig);

  return (
    <Select
      allowDeselect={false}
      data={_makeSelectDataFromPluginVizOptions({
        selectedValue,
        pluginVizOptions,
        pluginsGroupLabel: t`Plugins`,
        unlistedPluginChartLabel: t`Plugin chart`,
      })}
      size={size}
      className={className}
      label={withLabel ? t`Visualization Type` : undefined}
      aria-label={t`Visualization Type`}
      value={selectedValue}
      onChange={(optionValue) => {
        const target = _makeTargetFromOptionValue({
          optionValue,
          pluginVizOptions,
          columns,
        });
        if (target !== undefined) {
          onChange(target);
        }
      }}
    />
  );
}
