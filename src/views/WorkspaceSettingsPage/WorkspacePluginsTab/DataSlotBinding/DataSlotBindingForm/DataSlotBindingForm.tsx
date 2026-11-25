import { useLingui } from "@lingui/react/macro";
import { Button, Group, Stack, Text } from "@mantine/core";
import { useState } from "react";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import { DataSlotPanel } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/DataSlotPanel/DataSlotPanel";
import { useDataSlotDraftStatus } from "@/views/WorkspaceSettingsPage/WorkspacePluginsTab/DataSlotBinding/useDataSlotDraftStatus";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";
import type { PluginInstallation } from "$/models/PluginInstallation/PluginInstallation";
import type { PluginDataSlot } from "@avandar/plugin-manifest/runtime";

type Props = Readonly<{
  pluginName: string;
  installation: PluginInstallation.T;
  slotId: string;
  slot: PluginDataSlot;

  /** The slot's title, already localized. */
  slotTitle: string;
  localize: (value: string) => string;

  /** The slot's current binding, which the form starts from. */
  initialDraft: PluginDataSlotBinding.Draft | undefined;
  onClose: () => void;
}>;

/** Saves a slot's binding, then says so and closes the form. */
function useSaveBinding(options: {
  slotTitle: string;
  onClose: () => void;
}): ReturnType<typeof PluginDataSlotBindingClient.useSaveBinding> {
  const { slotTitle, onClose } = options;
  const { t } = useLingui();
  return PluginDataSlotBindingClient.useSaveBinding({
    queriesToInvalidate: [PluginDataSlotBindingClient.QueryKeys.getAll()],
    onSuccess: () => {
      notifySuccess(t`Saved the records for ${slotTitle}`);
      onClose();
    },
    onError: (error) => {
      notifyError({
        title: t`Could not save the records for ${slotTitle}`,
        message: error.message,
      });
    },
  });
}

/**
 * Rebinds one data slot of an installed plugin: the data slot panel, then
 * Cancel and Save. Save stays off until the binding is complete, and saving
 * replaces the slot's binding and closes the form.
 */
export function DataSlotBindingForm(props: Props): JSX.Element {
  const { pluginName, installation, slotId, slot, slotTitle, localize } = props;
  const { onClose } = props;
  const { t } = useLingui();
  const [draft, setDraft] = useState(props.initialDraft);
  const { status } = useDataSlotDraftStatus({ slot, draft });
  const [saveBinding, isSaving] = useSaveBinding({ slotTitle, onClose });
  return (
    <Stack gap="lg">
      <Stack gap="xxs">
        {slot.description === undefined ? null : (
          <Text size="sm">{localize(slot.description)}</Text>
        )}
        <Text size="sm" c="dimmed">
          {t`${pluginName} reads these records when someone runs one of its tools.`}
        </Text>
      </Stack>
      <DataSlotPanel
        {...{ slotId, slot, slotTitle, localize, draft }}
        onDraftChange={setDraft}
      />
      <Group justify="flex-end" gap="xs">
        <Button variant="default" onClick={onClose}>
          {t`Cancel`}
        </Button>
        <Button
          loading={isSaving}
          disabled={draft === undefined || status?.kind !== "bound"}
          onClick={() => {
            if (draft !== undefined) {
              saveBinding({ installationId: installation.id, draft });
            }
          }}
        >
          {t`Save`}
        </Button>
      </Group>
    </Stack>
  );
}
