import { useLingui } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";

type Props = Readonly<{
  pluginName: string;

  /** The slot's title, already localized. */
  slotTitle: string;
  binding: PluginDataSlotBinding.T;
}>;

/**
 * Removes an optional data slot's binding after the admin confirms, so the
 * plugin stops reading those records. Named after the slot, so a screen
 * reader tells it apart from other slots' buttons.
 */
export function RemoveDataSlotBindingButton({
  pluginName,
  slotTitle,
  binding,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [deleteBinding] = PluginDataSlotBindingClient.useDelete({
    queriesToInvalidate: [PluginDataSlotBindingClient.QueryKeys.getAll()],
  });
  return (
    <Button
      size="compact-sm"
      variant="subtle"
      color="danger"
      aria-label={t`Remove the records for ${slotTitle}`}
      onClick={() => {
        modals.openConfirmModal({
          title: t`Remove the records for ${slotTitle}?`,
          children: (
            <Text size="sm">
              {t`${pluginName} stops reading them until someone chooses records again.`}
            </Text>
          ),
          labels: { confirm: t`Remove`, cancel: t`Cancel` },
          confirmProps: { color: "danger" },
          onConfirm: () => {
            deleteBinding({ id: binding.id });
          },
        });
      }}
    >
      {t`Remove`}
    </Button>
  );
}
