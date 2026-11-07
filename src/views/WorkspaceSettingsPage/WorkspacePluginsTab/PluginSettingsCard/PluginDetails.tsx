import { matchLiteral } from "@avandar/utils";
import { Plural, Trans, useLingui } from "@lingui/react/macro";
import { List, Text } from "@mantine/core";
import { getContributionCountsFromManifest } from "@/lib/plugins/getContributionCountsFromManifest/getContributionCountsFromManifest";
import type {
  PluginManifest,
  PluginPermission,
} from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{ manifest: PluginManifest }>;

/**
 * What a plugin adds and which permissions it uses, in plain language, so an
 * admin can judge a plugin on its settings card before installing it.
 */
export function PluginDetails({ manifest }: Props): JSX.Element {
  const { t } = useLingui();
  const { dataExplorerToolbarItems } =
    getContributionCountsFromManifest(manifest);
  const describePermission = (permission: PluginPermission): string => {
    return matchLiteral(permission, {
      "data:context": t`Reads the query result you run it on`,
    });
  };
  return (
    <>
      <Text size="sm">
        <Plural
          value={dataExplorerToolbarItems}
          one="Adds # button to Data Explorer"
          other="Adds # buttons to Data Explorer"
        />
      </Text>
      {manifest.permissions.length === 0 ? (
        <Text size="sm" c="dimmed">
          <Trans>Uses no workspace data.</Trans>
        </Text>
      ) : (
        <List size="sm">
          {manifest.permissions.map((permission) => {
            return (
              <List.Item key={permission}>
                {describePermission(permission)}
              </List.Item>
            );
          })}
        </List>
      )}
    </>
  );
}
