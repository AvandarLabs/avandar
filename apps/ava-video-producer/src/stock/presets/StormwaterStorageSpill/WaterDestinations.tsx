import { SceneLabel } from "./SceneLabel";
import { WaterDestinationCaption } from "./WaterDestinationCaption";
import { WaterEquation } from "./WaterEquation";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { WaterDestination } from "./waterDestinationKeys";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number };
/** Persistent compartment labels and exact supplied-volume accounting. */
export function WaterDestinations({
  input,
  frame,
}: Readonly<Props>): ReactNode {
  const { incomingM3, infiltratedM3, dischargedM3 } = input.event;
  const remainder = incomingM3 - (infiltratedM3 + dischargedM3);
  const detained = Math.min(input.detentionCapacityM3, remainder);
  const overflow = remainder - detained;
  const amounts = {
    infiltration: infiltratedM3,
    discharge: dischargedM3,
    detained,
    overflow,
  };
  const order: WaterDestination[] =
    input.overflowSide === "left"
      ? ["overflow", "infiltration", "detained", "discharge"]
      : ["infiltration", "detained", "discharge", "overflow"];
  return (
    <g>
      {order.map((key, index) => (
        <WaterDestinationCaption
          key={key}
          destination={key}
          input={input}
          index={index}
          amount={amounts[key]}
        />
      ))}
      <WaterEquation input={input} frame={frame} />
      <SceneLabel
        text={input.copy.disclaimer}
        x={55}
        y={590}
        width={850}
        lines={1}
      />
    </g>
  );
}
