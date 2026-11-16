import { useLingui } from "@lingui/react/macro";
import { Loader, Stack } from "@mantine/core";
import { PluginDataSlotRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotRow";
import { PluginDataSlotRowActions } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/PluginDataSlotRowActions";
import { useDataSlotStatusRows } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/useDataSlotStatusRows";
import { PluginDetailsSection } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDetails/PluginDetailsSection";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  installation: PluginInstallation.T;
  canManage: boolean;
}>;

/**
 * The "Records it reads" block of an installed plugin's card: one line per
 * data slot with its status and source. Settings admins can choose, change,
 * or remove a slot's records from here.
 */
export function PluginDataSlotsSection({
  pluginName,
  manifestModule,
  installation,
  canManage,
}: Props): JSX.Element {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const rows = useDataSlotStatusRows({
    manifest: manifestModule.manifest,
    installation,
  });
  return (
    <PluginDetailsSection title={t`Records it reads`}>
      {rows === undefined ? (
        <Loader size="sm" role="status" aria-label={t`Loading the records`} />
      ) : (
        <Stack gap="sm">
          {rows.map((row) => {
            return (
              <PluginDataSlotRow
                key={row.slotId}
                row={row}
                localize={localize}
                actions={
                  canManage ? (
                    <PluginDataSlotRowActions
                      {...{ pluginName, manifestModule, installation, row }}
                      slotTitle={localize(row.slot.title)}
                    />
                  ) : null
                }
              />
            );
          })}
        </Stack>
      )}
    </PluginDetailsSection>
  );
}
