import { Modal as MantineModal } from "@mantine/core";
import type { ModalProps } from "@mantine/core";

export function Modal(props: ModalProps): JSX.Element {
  return (
    <MantineModal
      overlayProps={{ blur: 0, backgroundOpacity: 0.35 }}
      radius="sm"
      centered
      {...props}
    />
  );
}
