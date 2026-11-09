import { getLocalizedTextFromManifestStrings } from "@avandar/plugin-manifest/runtime";
import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { Fragment } from "react";
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

type SettingControlOptions = Readonly<{
  setting: PluginVizSetting;
  localize: (value: string) => string;
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaVizConfig.Plugin;
  onConfigChange: (nextConfig: AvaVizConfig.Plugin) => void;
}>;

/**
 * Makes the `Control` for one setting. A segmented control has no visible
 * label of its own, so it gets its localized label as a caption above it.
 */
function _makeControlElementFromSetting(
  options: SettingControlOptions,
): ReactNode {
  const { setting, localize, fields, config, onConfigChange } = options;
  const label = localize(setting.label);
  const control = (
    <Control
      label={label}
      spec={makeControlSpecFromPluginVizSetting({ setting, localize })}
      value={
        setting.control.kind === "columnPicker"
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
  if (setting.control.kind !== "segmented") {
    return control;
  }
  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        {label}
      </Text>
      {control}
    </Stack>
  );
}

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
        return (
          <Fragment key={setting.key}>
            {_makeControlElementFromSetting({
              setting,
              localize,
              fields,
              config,
              onConfigChange,
            })}
          </Fragment>
        );
      })}
    </Stack>
  );
}
