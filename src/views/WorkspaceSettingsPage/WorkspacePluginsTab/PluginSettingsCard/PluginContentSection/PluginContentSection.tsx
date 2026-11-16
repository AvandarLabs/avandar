import { useLingui } from "@lingui/react/macro";
import { Loader, Stack } from "@mantine/core";
import { getOwnValue } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/getOwnValue/getOwnValue";
import { useImportedPluginContent } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/useImportedPluginContent";
import { usePluginContentImports } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/pluginContent/usePluginContentImports/usePluginContentImports";
import { PluginContentRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginContentSection/PluginContentRow";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  manifestModule: PluginManifestModule;
  canManage: boolean;
}>;

/**
 * The "Datasets it includes" block of an installed plugin's card: each
 * bundled dataset, linked to the workspace's copy once imported. Settings
 * admins can import a missing one, or retry one that failed.
 */
export function PluginContentSection({
  manifestModule,
  canManage,
}: Props): JSX.Element {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const { importsByContentId, isLoading } = useImportedPluginContent(
    manifestModule.manifest.id,
  );
  const { statusesByContentId, importItems } =
    usePluginContentImports(manifestModule);
  return (
    <PluginDetailsSection title={t`Datasets it includes`}>
      {isLoading ? (
        <Loader size="sm" role="status" aria-label={t`Loading datasets`} />
      ) : (
        <Stack gap="xs">
          {manifestModule.manifest.contributes.content.map((item) => {
            const status = getOwnValue(statusesByContentId, item.id);
            return (
              <PluginContentRow
                key={item.id}
                title={localize(item.title)}
                datasetId={
                  getOwnValue(importsByContentId, item.id)?.datasetId ??
                  (status?.kind === "done" ? status.datasetId : undefined)
                }
                status={status}
                canManage={canManage}
                onImport={() => {
                  void importItems([item]);
                }}
              />
            );
          })}
        </Stack>
      )}
    </PluginDetailsSection>
  );
}
