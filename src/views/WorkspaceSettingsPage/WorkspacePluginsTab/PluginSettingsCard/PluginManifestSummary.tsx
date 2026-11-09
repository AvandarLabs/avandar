import { useLingui } from "@lingui/react/macro";
import { Text } from "@mantine/core";
import { PluginDetails } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails";
import type { PluginManifest } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  manifest: PluginManifest;

  /** The manifest's description, already translated for the locale. */
  description: string;
}>;

/**
 * Who published a plugin, which version it is, and what it does. A plugin's
 * settings card shows it whenever this deployment still bundles the plugin.
 */
export function PluginManifestSummary({
  manifest,
  description,
}: Props): JSX.Element {
  const { t } = useLingui();
  const publisher = manifest.id.split(".")[0] ?? "";
  const { version } = manifest;
  return (
    <>
      <Text size="sm" c="dimmed">
        {t`${publisher} · version ${version}`}
      </Text>
      <Text size="sm">{description}</Text>
      <PluginDetails manifest={manifest} />
    </>
  );
}
