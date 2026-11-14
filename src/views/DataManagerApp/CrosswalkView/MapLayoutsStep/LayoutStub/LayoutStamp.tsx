import { matchLiteral } from "@avandar/utils";
import { Trans } from "@lingui/react/macro";
import { Badge } from "@mantine/core";
import type { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import type { ReactNode } from "react";

type Props = {
  layout: Pick<CrosswalkDraft.Layout, "isReference" | "status">;
};

/**
 * Where a layout stands: Reference for the reference layout, otherwise
 * Mapped, Review, To do, or Skipped. Neutral except Reference (the one
 * the others are mapped onto) and Mapped (done).
 */
export function LayoutStamp({ layout }: Readonly<Props>): ReactNode {
  if (layout.isReference) {
    return (
      <Badge size="sm" variant="light" color="primary" tt="none">
        <Trans>Reference</Trans>
      </Badge>
    );
  }
  return matchLiteral(layout.status, {
    mapped: () => {
      return (
        <Badge size="sm" variant="light" color="success" tt="none">
          <Trans>Mapped</Trans>
        </Badge>
      );
    },
    review: () => {
      return (
        <Badge size="sm" variant="light" color="neutral" tt="none">
          <Trans>Review</Trans>
        </Badge>
      );
    },
    to_do: () => {
      return (
        <Badge size="sm" variant="outline" color="neutral" tt="none">
          <Trans>To do</Trans>
        </Badge>
      );
    },
    skipped: () => {
      return (
        <Badge size="sm" variant="outline" color="neutral" tt="none" c="dimmed">
          <Trans>Skipped</Trans>
        </Badge>
      );
    },
  });
}
