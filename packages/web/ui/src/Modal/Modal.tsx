import { Modal as MantineModal } from "@mantine/core";
import type { ModalProps } from "@mantine/core";

/**
 * Modal with Avandar overlay and spring pop-in defaults.
 * Requires MantineProvider + cssVariablesResolver (or matching CSS vars).
 */
export function Modal({
  overlayProps,
  transitionProps,
  styles,
  ...props
}: ModalProps): JSX.Element {
  return (
    <MantineModal
      centered
      radius="xl"
      overlayProps={{
        backgroundOpacity: 0,
        color: "transparent",
        style: {
          background: "var(--ava-overlay-background)",
          backdropFilter: "var(--ava-overlay-backdrop-filter)",
        },
        ...overlayProps,
      }}
      transitionProps={{
        transition: {
          in: {
            opacity: 1,
            transform: "scale(1) translateY(0)",
            filter: "blur(0)",
          },
          out: {
            opacity: 0,
            transform: "scale(0.72) translateY(20px)",
            filter: "blur(10px)",
          },
          common: { transformOrigin: "center center" },
          transitionProperty: "transform, opacity, filter",
        },
        duration: 380,
        timingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
        ...transitionProps,
      }}
      styles={{
        content: {
          border: "none",
          boxShadow: "var(--ava-overlay-panel-shadow)",
        },
        header: {
          borderBottom: "1px solid var(--ava-border-default)",
          minHeight: "unset",
          padding: "var(--mantine-spacing-sm) var(--mantine-spacing-md)",
        },
        body: {
          paddingTop: "var(--mantine-spacing-md)",
        },
        title: {
          fontWeight: 600,
        },
        ...styles,
      }}
      {...props}
    />
  );
}
