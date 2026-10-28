import { EASE, mix, ramp } from "../../../motion";
import { PremiseStrip } from "./PremiseStrip";
import { PremiseSupport } from "./PremiseSupport";
import type { Input } from "./ArgumentBridge.schema";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
  premise: Input["premises"][number];
  index: number;
  count: number;
  showSupport: boolean;
  relationship: Input["relationship"];
};
/** Each reason remains readable below its own joining section of the deck. */
export function ArgumentPremise({
  frame,
  accent,
  premise,
  index,
  count,
  showSupport,
  relationship,
}: Readonly<Props>): ReactNode {
  const slotWidth = 900 / count;
  const x = 30 + index * slotWidth;
  const center = x + slotWidth / 2;
  const arrival = ramp(frame, 12 + index * 6, 18);
  const joining = ramp(frame, 48 + index * 4, 28, EASE.inOut);
  return (
    <g
      data-premise={premise.id}
      opacity={arrival}
      transform={`translate(0 ${mix(arrival, 12, 0)})`}
    >
      <PremiseStrip {...{ premise, x, center, slotWidth }} />
      <PremiseSupport
        {...{
          joining,
          center,
          x,
          slotWidth,
          accent,
          premise,
          showSupport,
          relationship,
        }}
      />
    </g>
  );
}
