import { Modal as MantineModal, ModalProps } from "@mantine/core";

export function Modal(props: ModalProps): JSX.Element {
  return (
    <MantineModal
      overlayProps={{ blur: 4, opacity: 0.5 }}
      radius="md"
      centered
      {...props}
    />
  );
}
