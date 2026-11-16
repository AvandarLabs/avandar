import { useLingui } from "@lingui/react/macro";
import { Button, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { PluginDataSlotBindingClient } from "@/clients/plugins/PluginDataSlotBindingClient/PluginDataSlotBindingClient";
import { notifyError, notifySuccess } from "@/utils/notifications/notify";
import type { PluginDataSlotBinding } from "$/models/PluginDataSlotBinding/PluginDataSlotBinding";

type Props = Readonly<{
  pluginName: string;

  /** The slot's title, already localized. */
  slotTitle: string;
  binding: PluginDataSlotBinding.T;

  /**
   * Runs once the binding is removed. This button leaves the card then, so
   * the caller moves focus somewhere that stays.
   */
  onRemoved: () => void;
}>;

/**
 * Removes an optional data slot's binding after the admin confirms, so the
 * plugin stops reading those records, and says whether it worked. Named
 * after the slot, so a screen reader tells it apart from other slots'
 * buttons.
 */
export function RemoveDataSlotBindingButton({
  pluginName,
  slotTitle,
  binding,
  onRemoved,
}: Props): JSX.Element {
  const { t } = useLingui();
  const [deleteBinding] = PluginDataSlotBindingClient.useDelete({
    queriesToInvalidate: [PluginDataSlotBindingClient.QueryKeys.getAll()],
    onSuccess: () => {
      notifySuccess(t`Removed the records for ${slotTitle}`);
      onRemoved();
    },
    onError: (error) => {
      notifyError({
        title: t`Could not remove the records for ${slotTitle}`,
        message: error.message,
      });
    },
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
