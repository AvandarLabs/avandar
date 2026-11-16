import { useLingui } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { openDataSlotBindingModal } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/openDataSlotBindingModal";
import { RemoveDataSlotBindingButton } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/RemoveDataSlotBindingButton";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { DataSlotStatusRow } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginSettingsCard/PluginDataSlotsSection/useDataSlotStatusRows";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  installation: PluginInstallation.T;
  row: DataSlotStatusRow;

  /** The slot's title, already localized. */
  slotTitle: string;
}>;

/**
 * A settings admin's buttons for one data slot on a plugin's card: Choose or
 * Change, which opens the slot's binding modal, and Remove for an optional
 * slot with a binding. Each is named after the slot, so a screen reader
 * tells the slots' buttons apart.
 */
export function PluginDataSlotRowActions(props: Props): JSX.Element {
  const { pluginName, row, slotTitle } = props;
  const { t } = useLingui();
  const { binding } = row;
  return (
    <Group gap="xs" wrap="nowrap">
      <Button
        size="compact-sm"
        variant="default"
        aria-label={
          binding === undefined
            ? t`Choose the records for ${slotTitle}`
            : t`Change the records for ${slotTitle}`
        }
        onClick={() => {
          void openDataSlotBindingModal({
            pluginName,
            manifestModule: props.manifestModule,
            installation: props.installation,
            slotId: row.slotId,
          });
        }}
      >
        {binding === undefined ? t`Choose` : t`Change`}
      </Button>
      {binding === undefined || row.slot.required ? null : (
        <RemoveDataSlotBindingButton
          pluginName={pluginName}
          slotTitle={slotTitle}
          binding={binding}
        />
      )}
    </Group>
  );
}
