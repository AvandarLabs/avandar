import { Stack } from "@mantine/core";
import { PluginContentSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentSection";
import { PluginDataSlotsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotsSection";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  pluginName: string;

  /** Undefined for a plugin this deployment no longer bundles. */
  manifestModule: PluginManifestModule | undefined;

  /** Undefined for a plugin the workspace has not installed. */
  installation: PluginInstallation.T | undefined;
  canManage: boolean;
}>;

/**
 * The parts of an installed plugin's card that manage what it set up: the
 * records its data slots read and the datasets it bundles. Each shows only
 * when the manifest declares it. Nothing shows before the plugin is
 * installed, or once this deployment no longer bundles it.
 */
export function PluginInstalledSections({
  pluginName,
  manifestModule,
  installation,
  canManage,
}: Props): JSX.Element | null {
  if (manifestModule === undefined || installation === undefined) {
    return null;
  }
  const { manifest } = manifestModule;
  const hasDataSlots = Object.keys(manifest.dataSlots).length > 0;
  const hasContent = manifest.contributes.content.length > 0;
  if (!hasDataSlots && !hasContent) {
    return null;
  }
  return (
    <Stack gap="sm" mt="md">
      {hasDataSlots ? (
        <PluginDataSlotsSection
          {...{ pluginName, manifestModule, installation, canManage }}
        />
      ) : null}
      {hasContent ? (
        <PluginContentSection
          manifestModule={manifestModule}
          canManage={canManage}
        />
      ) : null}
    </Stack>
  );
}
