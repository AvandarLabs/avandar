import { Trans, useLingui } from "@lingui/react/macro";
import { Loader, Text } from "@mantine/core";
import { SettingsColumns } from "@/components/SettingsColumns/SettingsColumns";
import { PluginVizSettingControls } from "@/components/VisualizationContainer/VizSettingsForm/PluginVizSettingsForm/PluginVizSettingControls";
import { usePluginVizType } from "@/lib/plugins/vizs/usePluginVizType/usePluginVizType";
import type { QueryResult } from "$/models/queries/QueryResult/QueryResult";
import type { AvaVizConfig } from "$/models/vizs/AvaVizConfig/AvaVizConfig";
import type { SettingsColumnsLayout } from "@/components/SettingsColumns/SettingsColumns";
import type { ReactNode } from "react";

type Props = {
  fields: readonly QueryResult.ColumnWithId[];
  config: AvaVizConfig.Plugin;
  onConfigChange: (nextConfig: AvaVizConfig.Plugin) => void;

  /** How the setting group is arranged. Defaults to a vertical stack. */
  layout?: SettingsColumnsLayout;
};

/**
 * The settings form of a plugin chart, drawn from the settings its plugin's
 * manifest declares, in declaration order, in one group. It loads the
 * manifest but never the plugin's code. Column settings are stored by column
 * ID in `columnSettings`, and every other setting in `settings`.
 * `VizSettingsFormBody` renders it for plugin charts.
 */
export function PluginVizSettingsForm({
  fields,
  config,
  onConfigChange,
  layout = "stacked",
}: Props): ReactNode {
  const { t } = useLingui();
  const lookup = usePluginVizType(config);
  if (lookup.status === "loading") {
    return (
      <Loader size="sm" role="status" aria-label={t`Loading chart settings`} />
    );
  }
  if (lookup.status === "missing") {
    return (
      <Text size="sm" c="dimmed">
        <Trans>
          The plugin behind this chart is not available, so its settings cannot
          be shown.
        </Trans>
      </Text>
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
              manifestModule={lookup.manifestModule}
              settings={lookup.vizType.settings}
              onConfigChange={onConfigChange}
            />
          ),
        },
      ]}
    />
  );
}
