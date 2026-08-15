import { Tooltip } from "@avandar/ui";
import { matchLiteral } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Button, Group } from "@mantine/core";
import { IconWorld } from "@tabler/icons-react";
import type { PublishActionKind } from "@/views/DashboardApp/DashboardShareModal/DashboardPublishingModule/DashboardPublishingModule";
import type { ReactNode } from "react";

type Props = {
  actionKind: PublishActionKind;
  isBusy: boolean;
  /** Set when publishing is blocked for a reason outside this modal. */
  isBlockedReason: string | undefined;
  onPrimaryAction: () => void;
};

/**
 * The publish footer.
 *
 * Every kind except `unpublish` calls the same client method; the labels differ
 * because "Publish", "Update & republish", and "Make internal" describe very
 * different intentions to the person clicking them.
 */
export function PublishingActions({
  actionKind,
  isBusy,
  isBlockedReason,
  onPrimaryAction,
}: Readonly<Props>): ReactNode {
  const label = matchLiteral(actionKind, {
    publish_workspace: () => {
      return <Trans>Publish to workspace</Trans>;
    },
    publish_public: () => {
      return <Trans>Publish</Trans>;
    },
    republish: () => {
      return <Trans>Update &amp; republish</Trans>;
    },
    make_internal: () => {
      return <Trans>Make internal</Trans>;
    },
    unpublish: () => {
      return <Trans>Unpublish</Trans>;
    },
    disabled_no_audience: () => {
      return <Trans>Publish</Trans>;
    },
  });
  const isDisabled =
    actionKind === "disabled_no_audience" || isBlockedReason !== undefined;
  return (
    <Group justify="flex-end">
      <Tooltip label={isBlockedReason ?? ""} disabled={!isBlockedReason}>
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
          {label}
        </Button>
      </Tooltip>
    </Group>
  );
}
