import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import type { Input } from "./PrivateCaseConversation.schema";
import type { ReactNode } from "react";
/** Inputs for WaitingSpace. */
type Props = { input: Input; opacity: number };

/** Nearby waiting furniture and acknowledgement form the optional inset. */
export function WaitingSpace({ input, opacity }: Readonly<Props>): ReactNode {
  return (
    <g opacity={opacity} data-waiting-inset={input.showWaitingSupporter}>
      <rect
        x={650}
        y={150}
        width={262}
        height={380}
        rx={20}
        fill="none"
        stroke={STOCK.line}
      />
      <path
        d="M760 397 v54 h48 v-18 M760 451 v18 M808 451 v18"
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={4}
      />
      <LabelSlots
        labels={[
          [input.roomLabels.waiting, 670, 173, 222, 14, 3],
          [input.copy.acknowledgement, 650, 88, 262, 14, 4],
        ]}
      />
    </g>
  );
}
