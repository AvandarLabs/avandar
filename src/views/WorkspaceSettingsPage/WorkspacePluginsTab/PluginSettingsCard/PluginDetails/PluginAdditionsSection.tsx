import { Trans, useLingui } from "@lingui/react/macro";
import { List, Text } from "@mantine/core";
import { useMemo } from "react";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";

type Props = Readonly<{
  /** Data Explorer toolbar command titles, already localized. */
  toolbarCommandTitles: readonly string[];

  /** Chart type titles, already localized. */
  chartTypeTitles: readonly string[];
}>;

/**
 * The "What it adds" block of a plugin's details: one line per place in the
 * app the plugin adds to, naming each addition, so an admin knows what to
 * look for after installing it. Places with no additions are left out.
 */
export function PluginAdditionsSection({
  toolbarCommandTitles,
  chartTypeTitles,
}: Props): JSX.Element {
  const { t, i18n } = useLingui();
  // Narrow conjunctions keep a short run of names as "A, B" in English and
  // still use each locale's own separator, such as "、" in Chinese.
  const listFormat = useMemo(() => {
    return new Intl.ListFormat(i18n.locale, {
      type: "conjunction",
      style: "narrow",
    });
  }, [i18n.locale]);
  const toolbarCommands = listFormat.format(toolbarCommandTitles);
  const chartTypes = listFormat.format(chartTypeTitles);
  const hasAdditions =
    toolbarCommandTitles.length > 0 || chartTypeTitles.length > 0;
  return (
    <PluginDetailsSection title={<Trans>What it adds</Trans>}>
      {hasAdditions ? (
        <List size="sm">
          {toolbarCommandTitles.length > 0 ? (
            <List.Item>{t`Data Explorer toolbar: ${toolbarCommands}`}</List.Item>
          ) : null}
          {chartTypeTitles.length > 0 ? (
            <List.Item>{t`Chart types: ${chartTypes}`}</List.Item>
          ) : null}
        </List>
      ) : (
        <Text size="sm" c="dimmed">
          <Trans>Nothing yet.</Trans>
        </Text>
      )}
    </PluginDetailsSection>
  );
}
