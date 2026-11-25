import { StockRect } from "../../primitives/StockRect";
import type { usePublicationSnapshotSlicePresentation } from "./usePublicationSnapshotSlicePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof usePublicationSnapshotSlicePresentation>,
  "scales" | "tokens" | "accent" | "motion" | "frame"
>;
/** Render the published snapshot frame. */
export function PublishedSnapshotFrame(props: Readonly<Props>): ReactNode {
  return (
    <StockRect
      x={500}
      y={142}
      width={416}
      height={402}
      rx={props.scales.corner(props.tokens.corner.cell)}
      fill="none"
      stroke={props.accent}
      opacity={props.motion.ramp(props.frame, 56, props.motion.scale(39))}
    />
  );
}
