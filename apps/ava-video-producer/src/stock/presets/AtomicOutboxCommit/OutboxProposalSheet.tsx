import type { ReactNode } from "react";
type Props = { x: number; accent: string };
/** A dashed sheet half remains provisional before the shared commit. */
export function OutboxProposalSheet({ x, accent }: Readonly<Props>): ReactNode {
  return (
    <rect
      x={x}
      y={390}
      width={320}
      height={84}
      rx={4}
      stroke={accent}
      fill="none"
      strokeDasharray="4 5"
    />
  );
}
