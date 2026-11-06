import { EASE, mix, ramp } from "../../../motion";
import { getCarrierPositionFromInputAndFrame } from "./getCarrierPositionFromInputAndFrame";
import type { Input } from "./AidCargoModeHandoff.schema";
/** Data for getCargoPositionFromInputAndFrame. */
type GetCargoPositionResult = {
  x: number;
  y: number;
  owner: string;
  mechanism: string | undefined;
};

/**
 * A parcel rides its carrier until unloading and shares the receiver's later
 * travel.
 */
export function getCargoPositionFromInputAndFrame({
  frame,
  input,
  parcelIndex,
}: Readonly<{
  frame: number;
  input: Input;
  parcelIndex: number;
}>): GetCargoPositionResult {
  const offset = (parcelIndex - (input.parcels.length - 1) / 2) * 42;
  const boundary =
    input.carriers.length === 3 && frame >= 84 + parcelIndex * 2 ? 1 : 0;
  const start = (boundary === 0 ? 36 : 84) + parcelIndex * 2;
  const travel = ramp(frame, start, 20, EASE.inOut);
  const source = getCarrierPositionFromInputAndFrame({
    input,
    frame,
    index: boundary,
  });
  const receiver = getCarrierPositionFromInputAndFrame({
    input,
    frame,
    index: boundary + 1,
  });
  const mechanism =
    travel > 0 && travel < 1
      ? input.transferMethod === "hoist-and-cart" && boundary === 0
        ? "hoist"
        : "handcart"
      : undefined;
  return {
    x: mix(travel, source.x, receiver.x) + offset,
    y: 300 - Math.sin(travel * Math.PI) * 78,
    owner: mechanism
      ? "transfer"
      : input.carriers[boundary + (travel === 1 ? 1 : 0)].id,
    mechanism,
  };
}
