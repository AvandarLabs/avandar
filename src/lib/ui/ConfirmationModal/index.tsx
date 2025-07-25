import { Button, Group, Text } from "@mantine/core";
import { Modal } from "../Modal";

type ConfirmModalProps = {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
};

export function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  loading = false,
  title = "Confirm",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
}: ConfirmModalProps): JSX.Element {
  return (
    <Modal opened={opened} onClose={onClose} title={title}>
      <Text>{message}</Text>
      <Group mt="md" justify="flex-end">
        <Button variant="default" onClick={onClose}>
          {cancelText}
        </Button>
        <Button color="red" loading={loading} onClick={onConfirm}>
          {confirmText}
        </Button>
      </Group>
    </Modal>
  );
}
