import type { ReactNode } from "react";

import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";

type Props = {
  /**
   * The publishing controls, for a resource that has a published form. Absent
   * for every other type, which leaves Done alone on the right.
   */
  publishingActions: ReactNode;
  onClose: () => void;
};

/**
 * The modal's footer: Done on the left and, for a publishable resource, its
 * publish controls on the right. With nothing to publish the row collapses to
 * a single right-aligned Done, so the button never floats alone on the left.
 */
export function ShareResourceModalFooter({
  publishingActions,
  onClose,
}: Readonly<Props>): ReactNode {
  return (
    <Group justify={publishingActions ? "space-between" : "flex-end"} mt="md">
      <Button variant="default" onClick={onClose}>
        <Trans>Done</Trans>
      </Button>
      {publishingActions}
    </Group>
  );
}
