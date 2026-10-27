import { ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { ReconnectOutcomes } from "./ReconnectOutcomes";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./MissedVisitReconnect.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Unique people, attempts and exclusive outcomes retain separate totals. */
export function ReconnectLedger({ input, frame }: Readonly<Props>): ReactNode {
  const numAttempts = input.cases.reduce((sum, item) => sum + item.attempts, 0);
  return (
    <g opacity={ramp(frame, 115, 10)}>
      <ReconnectOutcomes input={input} />
      <SceneLabel
        text={input.copy.group}
        x={32}
        y={562}
        width={400}
        lines={3}
      />
      <text
        data-group-total={input.cases.length}
        x={440}
        y={562}
        fill={STOCK.text}
        fontSize={18}
      >
        {input.cases.length}
      </text>
      {input.showAttemptCount ? (
        <g>
          <SceneLabel
            text={input.copy.attempts}
            x={510}
            y={562}
            width={360}
            lines={3}
          />
          <text
            data-attempt-total={numAttempts}
            x={900}
            y={562}
            fill={STOCK.text}
            fontSize={18}
          >
            {numAttempts}
          </text>
        </g>
      ) : undefined}
    </g>
  );
}
