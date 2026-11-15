import { ramp } from "../../../motion";
import { SceneLabel } from "./SceneLabel";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";
/** Inputs for WaterEquation. */
type Props = { input: Input; frame: number };

/** All supplied inflow remains in the four explicit destinations. */
export function WaterEquation({ input, frame }: Readonly<Props>): ReactNode {
  const { incomingM3, infiltratedM3, dischargedM3 } = input.event;
  const remainder = incomingM3 - (infiltratedM3 + dischargedM3);
  const detained = Math.min(input.detentionCapacityM3, remainder);
  const overflow = remainder - detained;
  return (
    <g>
      <g
        data-overflow="quantity"
        data-quantity={overflow}
        opacity={ramp(frame, 108, 12)}
      >
        {input.showBalance ? (
          <SceneLabel
            text={`${incomingM3} = ${infiltratedM3} + ${dischargedM3} + ${detained} + ${overflow} ${input.copy.unit}`}
            x={55}
            y={551}
            width={850}
            lines={2}
          />
        ) : undefined}
      </g>
    </g>
  );
}
