import { useLingui } from "@lingui/react/macro";
import { Stack, Text } from "@mantine/core";
import { DataSlotPanel } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel";
import { InstallWizardStepHeading } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/PluginInstallWizard/InstallWizardStepHeading";
import { useLocalizePluginText } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/useLocalizePluginText";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginManifestModule } from "@/lib/plugins/PluginIndex.types";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  pluginName: string;
  manifestModule: PluginManifestModule;
  slotId: string;
  slot: PluginDataSlot;
  draft: PluginDataSlotBinding.Draft | undefined;
  onDraftChange: (draft: PluginDataSlotBinding.Draft | undefined) => void;
}>;

/**
 * One page of the install wizard's Data slots step: the slot's title and
 * description in the plugin's words, whether it is needed to install, and
 * the panel that binds it.
 */
export function DataSlotsStep({
  pluginName,
  manifestModule,
  slotId,
  slot,
  draft,
  onDraftChange,
}: Props): JSX.Element {
  const { t } = useLingui();
  const localize = useLocalizePluginText(manifestModule.strings);
  const slotTitle = localize(slot.title);
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        <InstallWizardStepHeading>{slotTitle}</InstallWizardStepHeading>
        {slot.description === undefined ? null : (
          <Text size="sm">{localize(slot.description)}</Text>
        )}
        <Text size="sm" c="dimmed">
          {slot.required
            ? t`${pluginName} needs these records before it can be installed.`
            : t`Optional. You can choose these records later on the plugin's card.`}
        </Text>
      </Stack>
      <DataSlotPanel
        slotId={slotId}
        slot={slot}
        slotTitle={slotTitle}
        localize={localize}
        draft={draft}
        onDraftChange={onDraftChange}
      />
    </Stack>
  );
}
