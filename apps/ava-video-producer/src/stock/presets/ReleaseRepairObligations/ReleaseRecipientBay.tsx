import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { StockRect } from "../../primitives/StockRect";
import type { useReleaseRepairObligationsPresentation } from "./useReleaseRepairObligationsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useReleaseRepairObligationsPresentation>,
  "motion" | "frame" | "scales" | "tokens" | "atomic" | "input"
>;
/** Render the release recipient bay. */
export function ReleaseRecipientBay(props: Readonly<Props>): ReactNode {
  return (
    <g opacity={props.motion.reveal(props.frame, 12)}>
      <StockRect
        data-recipient-bay="true"
        x={550}
        y={88}
        width={350}
        height={322}
        rx={props.scales.corner(props.tokens.corner.card)}
        fill="none"
        stroke={props.tokens.color.line}
        strokeDasharray={props.atomic.dash.long.join(" ")}
      />
      <LabelSlots
        labels={[[props.input.recipientLabel, 550, 35, 350, 16, 3]]}
      />
    </g>
  );
}
