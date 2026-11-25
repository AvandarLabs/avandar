import { Trans } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { PluginCardHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginCardHeading";
import { PluginManifestSummary } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginManifestSummary";
import type { PluginInstallStatus } from "@/lib/plugins/getPluginInstallStatusFromInstallation/getPluginInstallStatusFromInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  /** The id of the card's heading, which the card and its actions point to. */
  headingId: string;
  pluginName: string;
  status: PluginInstallStatus;

  /** Undefined for a plugin this deployment no longer bundles. */
  manifestModule: PluginManifestModule | undefined;

  /** The manifest's description, already translated for the locale. */
  description: string;
}>;

/**
 * The left side of a plugin's settings card: its heading with the install
 * status, then what it does. A plugin this deployment no longer bundles says
 * why it can only be uninstalled instead.
 */
export function PluginCardSummary({
  headingId,
  pluginName,
  status,
  manifestModule,
  description,
}: Props): JSX.Element {
  const manifest = manifestModule?.manifest;
  return (
    <Stack gap="xxs">
      <PluginCardHeading
        headingId={headingId}
        pluginName={pluginName}
        icon={
          manifest === undefined
            ? undefined
            : manifestModule?.icons[manifest.icon]
        }
        status={status}
      />
      {manifestModule === undefined ? (
        <Text size="sm" c="dimmed">
          <Trans>
            No longer included in this deployment. Uninstall to remove it from
            this workspace.
          </Trans>
        </Text>
      ) : (
        <PluginManifestSummary
          manifestModule={manifestModule}
          description={description}
          headingId={headingId}
        />
      )}
    </Stack>
  );
}
