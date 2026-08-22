import type { PublishActionKind } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import type { ReactNode } from "react";

import { Tooltip } from "@avandar/ui";
import { Trans } from "@lingui/react/macro";
import { Box, Button, Group } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";

import { NuxAnchors } from "@/components/Nux/NuxAnchors/NuxAnchors";
import { PrimaryActionLabel } from "@/views/DashboardApp/DashboardShareModal/PublishingActions/PrimaryActionLabel";

type Props = {
  actionKind: PublishActionKind;
  isBusy: boolean;
  /** Set when publishing is blocked for a reason outside this modal. */
  isBlockedReason: string | undefined;
  /**
   * Set only when the block is the plan limit. A disabled button cannot be
   * clicked, so the way out of the block needs a button of its own.
   */
  onUpgrade?: () => void;
  onPrimaryAction: () => void;
};

/**
 * The primary button's label. Every kind except `unpublish` calls the same
 * client method; the labels differ because "Publish", "Update & republish",
 * and "Make internal" describe very different intentions to the person
 * clicking them.
 */

/** The publish footer: the primary action, plus the upgrade way out. */
export function PublishingActions({
  actionKind,
  isBusy,
  isBlockedReason,
  onUpgrade,
  onPrimaryAction,
}: Readonly<Props>): ReactNode {
  const isDisabled =
    actionKind === "disabled_no_audience" || isBlockedReason !== undefined;
  return (
    <Group justify="flex-end">
      {onUpgrade ? (
        <Button variant="light" onClick={onUpgrade}>
          <Trans>Upgrade plan</Trans>
        </Button>
      ) : null}
      <Tooltip label={isBlockedReason ?? ""} disabled={!isBlockedReason}>
        <Box {...NuxAnchors.props(NuxAnchors.ids.dashboardPublishButton)}>
          <Button
            loading={isBusy}
            disabled={isDisabled}
            onClick={onPrimaryAction}
            color={actionKind === "unpublish" ? "red" : undefined}
            variant={actionKind === "unpublish" ? "light" : "filled"}
            leftSection={
              actionKind === "unpublish" ? undefined : <IconWorld size={16} />
            }
          >
            <PrimaryActionLabel actionKind={actionKind} />
          </Button>
        </Box>
      </Tooltip>
    </Group>
  );
}
