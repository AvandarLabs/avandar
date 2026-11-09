import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { PluginDetails } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetails";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  manifestModule: PluginManifestModule;

  /** The manifest's description, already translated for the locale. */
  description: string;

  /** The id of the card's heading, which describes the details toggle. */
  headingId: string;
}>;

/**
 * Who published a plugin, which version it is, and what it does. A plugin's
 * settings card shows it whenever this deployment still bundles the plugin.
 */
export function PluginManifestSummary({
  manifestModule,
  description,
  headingId,
}: Props): JSX.Element {
  const { t } = useLingui();
  const { manifest, strings } = manifestModule;
  const publisher = manifest.id.split(".")[0] ?? "";
  const { version } = manifest;
  return (
    <>
      <Text size="sm" c="dimmed">
        {t`${publisher} · version ${version}`}
      </Text>
      <Text size="sm">{description}</Text>
      <PluginDetails
        manifest={manifest}
        strings={strings}
        headingId={headingId}
      />
    </>
  );
}
