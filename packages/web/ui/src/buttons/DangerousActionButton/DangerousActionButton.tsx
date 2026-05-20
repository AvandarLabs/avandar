import { useLingui } from "@lingui/react/macro";
import { ActionIcon, Button, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { noop } from "@utils";

type Props = {
  label: string;
  asIcon?: boolean;
  icon?: React.ReactNode;
  loading?: boolean;
  confirmModalProps?: {
    title?: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => Promise<void> | void;
  };
};

const trashIcon = <IconTrash size="1rem" />;

/**
 * A red button that asks for confirmation before triggering a destructive
 * action. The default confirmation modal uses translated default copy; pass
 * `confirmModalProps` to override any of the strings.
 */
export function DangerousActionButton({
  label,
  asIcon = false,
  icon = trashIcon,
  confirmModalProps,
  loading = false,
}: Props): JSX.Element {
  const { t } = useLingui();

  const defaultConfirmProps = {
    title: t`Confirm Action`,
    message: t`Are you sure you want to proceed with this action? This cannot be undone.`,
    confirmLabel: t`Confirm`,
    cancelLabel: t`Cancel`,
    onConfirm: noop,
  };

  const modalProps = { ...defaultConfirmProps, ...confirmModalProps };

  const onClick = () => {
    const modalId = modals.openConfirmModal({
      title: modalProps.title,
      children: modalProps.message,
      labels: {
        confirm: modalProps.confirmLabel,
        cancel: modalProps.cancelLabel,
      },
      confirmProps: { color: "danger", loading },
      closeOnConfirm: false,
      onConfirm: async () => {
        await modalProps.onConfirm();
        modals.close(modalId);
      },
    });
  };

  if (asIcon) {
    return (
      <Tooltip label={label}>
        <ActionIcon color="danger" onClick={onClick} loading={loading}>
          {icon}
        </ActionIcon>
      </Tooltip>
    );
  }

  return (
    <Button
      color="danger"
      leftSection={icon}
      onClick={onClick}
      loading={loading}
    >
      {label}
    </Button>
  );
}
