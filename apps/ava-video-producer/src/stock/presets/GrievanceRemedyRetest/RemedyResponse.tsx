import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { RemedyStageLabels } from "./RemedyStageLabels";
import type { Input } from "./GrievanceRemedyRetest.schema";
import type { ReactNode } from "react";

type Props = { frame: number; input: Input; accent: string };
/** The participant response follows the test and independently owns closure. */
export function RemedyResponse({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const response =
    frame < 120
      ? input.labels.pending
      : input.participantResponse === "accepted"
        ? input.labels.accepted
        : input.participantResponse === "not-accepted"
          ? input.labels.notAccepted
          : input.labels.pending;
  const isClosed = frame >= 120 && input.participantResponse === "accepted";
  return (
    <g>
      <RemedyStageLabels frame={frame} input={input} />
      <LabelSlots labels={[[response, 80, 559, 832, 18, 2]]} />
      <circle
        data-response-marker="separate"
        cx={59}
        cy={552}
        r={10}
        fill={isClosed ? accent : "none"}
        stroke={isClosed ? accent : STOCK.orange}
        strokeWidth={3}
      />
    </g>
  );
}
