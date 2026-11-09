import { matchLiteral } from "@avandar/utils";
import { Trans, useLingui } from "@lingui/react/macro";
import { List, Text } from "@mantine/core";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import type { PluginPermission } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  permissions: readonly PluginPermission[];

  /** Whether the plugin adds chart types, which read their own rows. */
  hasChartTypes: boolean;
}>;

/**
 * The "Data it can read" block of a plugin's details: each permission the
 * plugin asks for, plus what its charts see, in plain language, so an admin
 * can judge what workspace data a plugin reaches before installing it.
 */
export function PluginDataAccessSection({
  permissions,
  hasChartTypes,
}: Props): JSX.Element {
  const { t } = useLingui();
  const permissionLines = permissions.map((permission) => {
    return {
      key: permission,
      text: matchLiteral(permission, {
        "data:context": t`A query result's rows, only when you run one of its tools on that result`,
      }),
    };
  });
  const lines = hasChartTypes
    ? [
        ...permissionLines,
        {
          key: "charts",
          text: t`Its charts see only the rows of the chart they draw`,
        },
      ]
    : permissionLines;
  return (
    <PluginDetailsSection title={<Trans>Data it can read</Trans>}>
      {lines.length === 0 ? (
        <Text size="sm" c="dimmed">
          <Trans>Uses no workspace data.</Trans>
        </Text>
      ) : (
        <List size="sm">
          {lines.map((line) => {
            return <List.Item key={line.key}>{line.text}</List.Item>;
          })}
        </List>
      )}
    </PluginDetailsSection>
  );
}
