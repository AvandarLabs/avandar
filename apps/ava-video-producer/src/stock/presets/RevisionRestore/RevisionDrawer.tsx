import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
type Props = { hasDrawer: boolean };
/** Saved impressions sit in a local drawer or a labeled margin recess. */
export function RevisionDrawer({ hasDrawer }: Readonly<Props>): ReactNode {
  return (
    <g>
      {hasDrawer ? (
        <path
          data-storage-drawer="true"
          d="M30 385 V582 H930 V385 M30 390 H930"
          fill="none"
          stroke={STOCK.line}
          strokeWidth={2}
        />
      ) : (
        <path
          data-storage-recess="true"
          d="M30 382 V582 H930"
          fill="none"
          stroke={STOCK.line}
          strokeDasharray="4 5"
        />
      )}
    </g>
  );
}
