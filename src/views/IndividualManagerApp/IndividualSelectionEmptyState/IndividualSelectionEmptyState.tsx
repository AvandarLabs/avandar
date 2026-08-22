import type { ReactNode } from "react";

import { Trans, useLingui } from "@lingui/react/macro";
import { IconInbox, IconListDetails } from "@tabler/icons-react";

import { CanvasEmptyState } from "@/components/CanvasEmptyState/CanvasEmptyState";

type Props = {
  conceptName: string;
  hasRecords: boolean;
  action?: ReactNode;
};

/**
 * Detail-pane empty state for a case type's records: either pick one, or
 * sync the case type if none exist yet.
 */
export function IndividualSelectionEmptyState({
  conceptName,
  hasRecords,
  action,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();

  if (hasRecords) {
    return (
      <CanvasEmptyState
        icon={<IconListDetails size={32} stroke={1.5} aria-hidden />}
        title={t`Select a ${conceptName}`}
        message={t`Pick one from the list to see its details.`}
      />
    );
  }

  return (
    <CanvasEmptyState
      icon={<IconInbox size={32} stroke={1.5} aria-hidden />}
      title={t`No ${conceptName} records yet`}
      message={
        <Trans>
          Sync this case type from Case Manager to create records from your
          data.
        </Trans>
      }
      action={action}
    />
  );
}
