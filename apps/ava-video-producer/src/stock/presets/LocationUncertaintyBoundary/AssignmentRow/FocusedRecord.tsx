import type { ReactNode } from "react";

type Props = { id: string; index: number; accent: string };
/** Highlights the focused assignment record. */
export function FocusedRecord({
  id,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <rect
      data-focused-record={id}
      x={472}
      y={315 + index * 31}
      width={370}
      height={25}
      rx={4}
      fill={accent}
      fillOpacity={0.12}
      stroke={accent}
      strokeWidth={2}
    />
  );
}
