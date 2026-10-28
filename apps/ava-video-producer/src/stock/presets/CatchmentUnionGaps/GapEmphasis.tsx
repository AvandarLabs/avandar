import { STOCK } from "../../stockPalette";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";

type Props = {
  householdId: string;
  railY: number;
  covered: boolean;
  progress: number;
  gapEmphasis: Input["gapEmphasis"];
};
/** Only supplied uncovered homes receive the authored gap treatment. */
export function GapEmphasis({
  householdId,
  railY,
  covered,
  progress,
  gapEmphasis,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      {" "}
      {!covered ? (
        <g opacity={progress}>
          <rect
            data-uncovered-emphasis={householdId}
            x={626}
            y={railY - 11}
            width={24}
            height={24}
            rx={4}
            fill="none"
            stroke={STOCK.orange}
          />
          {gapEmphasis === "hatch" ? (
            <path
              d={`M627 ${railY + 10} l4 -4 M627 ${railY + 2} l4 -4 M644 ${railY + 10} l5 -5 M644 ${railY - 5} l4 -4`}
              stroke={STOCK.orange}
            />
          ) : undefined}
        </g>
      ) : undefined}
    </g>
  );
}
