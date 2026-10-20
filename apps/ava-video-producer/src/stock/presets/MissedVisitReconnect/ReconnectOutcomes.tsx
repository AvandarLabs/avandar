import { propEq } from "@avandar/utils";
import { STOCK } from "../../stockPalette";
import { ReconnectOutcomeMark } from "./ReconnectOutcomeMark";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";
type Props = { input: Input };
const OUTCOMES: readonly ["unreached", "contacted", "booked", "attended"] = [
  "unreached",
  "contacted",
  "booked",
  "attended",
] as const;
/** Exclusive outcomes are counted against the original missed-visit group. */
export function ReconnectOutcomes({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      {input.showOutcomeLedger
        ? OUTCOMES.map((outcome, index) => (
            <g key={outcome} data-outcome-count={outcome}>
              <ReconnectOutcomeMark
                outcome={outcome}
                x={30 + index * 230}
                y={480}
                frame={150}
                accent={STOCK.text}
              />
              <text
                x={55 + index * 230}
                y={480}
                fill={STOCK.text}
                fontSize={18}
              >
                {input.cases.filter(propEq("outcome", outcome)).length}/
                {input.cases.length}
              </text>
              <SceneLabel
                text={input.copy[outcome]}
                x={22 + index * 230}
                y={505}
                width={215}
                lines={4}
              />
            </g>
          ))
        : undefined}
    </g>
  );
}
