import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { Stack } from "@mantine/core";
import { Control } from "@/components/VisualizationContainer/VizSettingsForm/Control/Control";
import {
  makeControlSpecFromPluginVizSetting,
  makePluginVizConfigFromSettingValue,
} from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginVizSetting } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaVizConfig.Plugin;

  /** The plugin's manifest module, whose strings hold the settings' text. */
  manifestModule: PluginManifestModule;
  settings: readonly PluginVizSetting[];
  onConfigChange: (nextConfig: AvaVizConfig.Plugin) => void;
};

/**
 * One `Control` per setting a plugin chart's manifest declares, in
 * declaration order, with labels and option labels in the current language.
 * `PluginVizSettingsForm` renders it as its only group.
 */
export function PluginVizSettingControls({
  fields,
  config,
  manifestModule,
  settings,
  onConfigChange,
}: Props): ReactNode {
  const { i18n } = useLingui();
  const localize = (value: string): string => {
    return getLocalizedTextFromManifestStrings({
      strings: manifestModule.strings,
      locale: i18n.locale,
      value,
    });
  };
  return (
    <Stack gap="xs">
      {settings.map((setting) => {
        const isColumnSetting = setting.control.kind === "columnPicker";
        return (
          <Control
            key={setting.key}
            label={localize(setting.label)}
            spec={makeControlSpecFromPluginVizSetting({ setting, localize })}
            value={
              isColumnSetting
                ? config.columnSettings[setting.key]
                : config.settings[setting.key]
            }
            fields={fields}
            onChange={(nextValue) => {
              onConfigChange(
                makePluginVizConfigFromSettingValue({
                  config,
                  setting,
                  value: nextValue,
                  fields,
                }),
              );
            }}
          />
        );
      })}
    </Stack>
  );
}
