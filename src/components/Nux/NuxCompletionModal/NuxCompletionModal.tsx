import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Modal, Stack, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";
import clsx from "clsx";

import { NuxCompletionBurst } from "@/components/Nux/NuxCompletionModal/NuxCompletionBurst/NuxCompletionBurst";
import css from "@/components/Nux/NuxCompletionModal/NuxCompletionModal.module.css";
import { ANIMATION_PRESET, MODAL_ABOVE_NUX_TOUR_Z_INDEX } from "@/config/Theme";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * The first-dashboard tutorial's finale: shown after a successful publish
 * that completes the last milestone.
 */
export function NuxCompletionModal({
  isOpen,
  onClose,
}: Readonly<Props>): ReactNode {
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      centered
      size="sm"
      withCloseButton={false}
      zIndex={MODAL_ABOVE_NUX_TOUR_Z_INDEX}
      classNames={{
        header: css.nuxCompletionModalHeader,
        title: css.nuxCompletionModalTitle,
      }}
      title={<Trans>Congratulations</Trans>}
    >
      <Stack align="center" gap="lg" pt="xs">
        <div className={css.nuxCompletionModalStage}>
          <NuxCompletionBurst />
          <span className={css.nuxCompletionModalRing} aria-hidden />
          <span
            className={clsx(
              css.nuxCompletionModalRing,
              css.nuxCompletionModalRingLate,
            )}
            aria-hidden
          />
          <div
            className={clsx(
              css.nuxCompletionModalSeal,
              ANIMATION_PRESET.popIn.className,
            )}
          >
            <IconCheck size={32} stroke={2.4} aria-hidden />
          </div>
        </div>
        <Text size="sm" ta="center" className={css.nuxCompletionModalBody}>
          <Trans>
            You shared your first dashboard with your workspace. Anyone there
            can open it whenever they need it.
          </Trans>
        </Text>
        <Button onClick={onClose} fullWidth>
          <Trans>Continue</Trans>
        </Button>
      </Stack>
    </Modal>
  );
}
