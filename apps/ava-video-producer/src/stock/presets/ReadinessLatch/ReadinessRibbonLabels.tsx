import { FitText } from "../../primitives/FitText/FitText";
import { STOCK } from "../../stockPalette";
import type { Input } from "./ReadinessLatch.schema";
import type { ReactNode } from "react";
type Props = {
  participant: Input["participants"][number];
  input: Input;
  state: string;
  horizontal: boolean;
  x: number;
  y: number;
};
const VALUE: { fill: "#728794"; fontSize: number; fontFamily: string } = {
  fill: STOCK.muted,
  fontSize: 12,
  fontFamily: "Arial, sans-serif",
};
const TEXT: {
  fontSize: 12;
  breakLongWords: boolean;
  normalizeWhitespace: boolean;
} = {
  fontSize: 12 as const,
  breakLongWords: true,
  normalizeWhitespace: true,
};
/** Each branch has separate stable slots for its name, state and quantity. */
export function ReadinessRibbonLabels({
  participant,
  input,
  state,
  horizontal,
  x,
  y,
}: Readonly<Props>): ReactNode {
  const label = {
    text: participant.label,
    x: horizontal ? 40 : x + 4,
    y: horizontal ? y - 8 : 135,
    width: horizontal ? 230 : 146,
    maxLines: 3,
    anchor: horizontal ? ("start" as const) : ("middle" as const),
  };
  const status = {
    text: state,
    x: horizontal ? 720 : x + 4,
    y: horizontal ? y - 8 : 190,
    width: horizontal ? 210 : 146,
    maxLines: 4,
    anchor: horizontal ? ("start" as const) : ("middle" as const),
    color: STOCK.orange,
  };
  const unit = {
    text: input.unitLabel,
    x: horizontal ? 324 : x - 50,
    y: horizontal ? y + 35 : 256,
    width: horizontal ? 280 : 118,
    maxLines: 3,
  };
  const value = {
    x: horizontal ? 300 : x - 75,
    y: unit.y,
    ...VALUE,
  };
  return (
    <g>
      <FitText {...TEXT} {...label} />
      {input.showParticipantStates ? (
        <FitText {...TEXT} {...status} />
      ) : undefined}
      {input.showWorkValues ? (
        <g>
          <text {...value}>{participant.workUnits}</text>
          <FitText {...TEXT} {...unit} />
        </g>
      ) : undefined}
    </g>
  );
}
