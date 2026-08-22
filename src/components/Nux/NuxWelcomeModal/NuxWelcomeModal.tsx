import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Group, Modal, Stack, Text } from "@mantine/core";

type Props = {
  isOpen: boolean;
  onStart: () => void;
  onDecline: () => void;
};

/**
 * The one-time invite.
 *
 * Shown at most once per user: both buttons write `in_progress`, and the
 * invite's condition is `status === "not_started"`.
 *
 * The copy names the outcome and the time cost, because setting an
 * expectation up front is what makes people finish. It deliberately does not
 * mention colleagues seeing the result: the goal here is to lower the stakes
 * of starting, and sharing is explained when they get to it.
 */
export function NuxWelcomeModal({
  isOpen,
  onStart,
  onDecline,
}: Readonly<Props>): ReactNode {
  return (
    <Modal
      opened={isOpen}
      onClose={onDecline}
      centered
      size="md"
      title={<Trans>Welcome to Avandar</Trans>}
    >
      <Stack gap="lg">
        <Text size="sm">
          <Trans>
            Want a quick tour? In about 5 minutes you'll go from a spreadsheet
            to your first dashboard.
          </Trans>
        </Text>
        <Group justify="flex-end">
          <Button variant="default" onClick={onDecline}>
            <Trans>Not now</Trans>
          </Button>
          <Button onClick={onStart}>
            <Trans>Start tour</Trans>
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
