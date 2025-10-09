import { ActionIcon, Button, Tooltip } from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconTrash } from "@tabler/icons-react";
import { noopEventHandler } from "@/lib/utils/misc";

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

const DEFAULT_CONFIRM_PROPS = {
  title: "Confirm Action",
  message:
    "Are you sure you want to proceed with this action? This cannot be undone.",
  confirmLabel: "Confirm",
  cancelLabel: "Cancel",
  onConfirm: noopEventHandler,
};

export function DangerousActionButton({
  label,
  asIcon = false,
  icon = trashIcon,
  confirmModalProps = DEFAULT_CONFIRM_PROPS,
  loading = false,
}: Props): JSX.Element {
  const modalProps = { ...DEFAULT_CONFIRM_PROPS, ...confirmModalProps };

  const onClick = () => {
    const modalId = modals.openConfirmModal({
      title: modalProps.title,
      children: modalProps.message,
      labels: {
        confirm: modalProps.confirmLabel,
        cancel: modalProps.cancelLabel,
      },
      confirmProps: { color: "danger", loading },
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
