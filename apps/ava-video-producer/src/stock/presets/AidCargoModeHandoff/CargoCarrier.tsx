import { ramp } from "../../../motion";
import { CargoCarrierShape } from "./CargoCarrierShape/CargoCarrierShape";
import { getCarrierPositionFromInputAndFrame } from "./getCarrierPositionFromInputAndFrame";
import type { Input } from "./AidCargoModeHandoff.schema";
import type { ReactNode } from "react";

type Props = {
  carrier: Input["carriers"][number];
  input: Input;
  frame: number;
  index: number;
  accent: string;
};
/** A boat, road truck or cargo cycle supports the same bounded load. */
export function CargoCarrier({
  carrier,
  input,
  frame,
  index,
  accent,
}: Readonly<Props>): ReactNode {
  const { x, y } = getCarrierPositionFromInputAndFrame({ input, frame, index });
  return (
    <g
      data-carrier={carrier.id}
      data-mode={carrier.mode}
      opacity={ramp(frame, 10 + index * 3, 12)}
      transform={`translate(${x} ${y})`}
    >
      <CargoCarrierShape mode={carrier.mode} accent={accent} />
    </g>
  );
}
