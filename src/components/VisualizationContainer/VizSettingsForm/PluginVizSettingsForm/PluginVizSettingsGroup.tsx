import { useLingui } from "@lingui/react/macro";
import { AvaPluginVizConfigs } from "$/models/vizs/AvaPluginVizConfig/AvaPluginVizConfigs";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { PluginVizSettingControls } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls";
import { isPluginVizConfigReadable } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/pluginVizSettingFormHelpers";
import { UnreadablePluginVizSettings } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/UnreadablePluginVizSettings";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginVizType } from "@avandar/plugin-manifest/runtime";
import type { ReactNode } from "react";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaVizConfig.Plugin;

  /** The plugin's manifest module, whose strings hold the settings' text. */
  manifestModule: PluginManifestModule;

  /** The chart type `config` draws, from the plugin's manifest. */
  vizType: PluginVizType;
  layout: SettingsColumnsLayout;
  onConfigChange: (nextConfig: AvaVizConfig.Plugin) => void;
};

/**
 * The settings group `PluginVizSettingsForm` shows once the chart type's
 * manifest has loaded: one control per setting, or, when the stored config
 * cannot be read, a notice that resets it to the defaults a new pick of the
 * chart type gets. The controls only ever receive a config that parsed.
 */
export function PluginVizSettingsGroup({
  fields,
  config,
  manifestModule,
  vizType,
  layout,
  onConfigChange,
}: Props): ReactNode {
  const { t } = useLingui();
  const { settings } = vizType;
  if (!isPluginVizConfigReadable({ config, settings, fields })) {
    const defaultConfig = AvaPluginVizConfigs.makeConfig({
      pluginId: config.pluginId,
      pluginVizId: vizType.id,
      settings,
      columns: fields,
    });
    return (
      <UnreadablePluginVizSettings
        onReset={() => {
          onConfigChange(defaultConfig);
        }}
      />
    );
  }
  return (
    <SettingsColumns
      layout={layout}
      groups={[
        {
          id: "plugin-settings",
          title: t`Chart settings`,
          content: (
            <PluginVizSettingControls
              fields={fields}
              config={config}
              manifestModule={manifestModule}
              settings={settings}
              onConfigChange={onConfigChange}
            />
          ),
        },
      ]}
    />
  );
}
