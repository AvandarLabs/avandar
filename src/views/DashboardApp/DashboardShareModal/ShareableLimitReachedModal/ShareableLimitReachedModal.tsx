import type { Subscription } from "$/models/Subscription/Subscription";
import type { ReactNode } from "react";

import { useLingui } from "@lingui/react/macro";
import { Modal, Stack } from "@mantine/core";

import { WorkspaceBillingView } from "@/views/WorkspaceSettingsPage/WorkspaceBillingView/WorkspaceBillingView";

import { LimitMessage } from "./LimitMessage";

type Props = {
  subscription: Subscription.T | undefined;
  isOpened: boolean;
  onClose: () => void;
};

/**
 * The "shareable dashboard limit reached" modal, offered when the plan will
 * not let the workspace make another dashboard reachable by anyone other than
 * its owner. It embeds the plan picker so the upgrade can happen in place, and
 * it is dismissible: everything else about the workspace still works, and only
 * this one publish is blocked.
 */
export function ShareableLimitReachedModal({
  subscription,
  isOpened,
  onClose,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  return (
    <Modal
      title={t`Shared dashboard limit reached`}
      opened={isOpened}
      onClose={onClose}
      size="100%"
    >
      <Stack>
        <LimitMessage subscription={subscription} />
        <WorkspaceBillingView hideTitle hideIntroText />
      </Stack>
    </Modal>
  );
}
