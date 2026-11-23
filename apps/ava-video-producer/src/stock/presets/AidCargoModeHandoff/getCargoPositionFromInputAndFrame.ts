import { Motion } from "../../../motion";
import { getCarrierPositionFromInputAndFrame } from "./getCarrierPositionFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./AidCargoModeHandoff.schema";
/** Inputs for getTransferMechanism. */
type GetTransferMechanismArguments = {
  travel: number;
  input: Input;
  boundary: number;
};

/** Data for getCargoPositionFromInputAndFrame. */
type GetCargoPositionResult = {
  x: number;
  y: number;
  owner: string;
  mechanism: string | undefined;
};
type CargoPositionArgs = Readonly<{
  frame: number;
  input: Input;
  parcelIndex: number;
  motion: VideoMotion;
}>;

/** The handling equipment moving a parcel across a boundary, mid-transfer. */
function _getTransferMechanism({
  travel,
  input,
  boundary,
}: Readonly<GetTransferMechanismArguments>): string | undefined {
  return travel > 0 && travel < 1
    ? input.transferMethod === "hoist-and-cart" && boundary === 0
      ? "hoist"
      : "handcart"
    : undefined;
}

/**
 * A parcel rides its carrier until unloading and shares the receiver's later
 * travel.
 */
export function getCargoPositionFromInputAndFrame({
  frame,
  input,
  parcelIndex,
  motion,
}: CargoPositionArgs): GetCargoPositionResult {
  const offset = (parcelIndex - (input.parcels.length - 1) / 2) * 42;
  const boundary =
    input.carriers.length === 3 && frame >= 84 + parcelIndex * 2 ? 1 : 0;
  const start = (boundary === 0 ? 36 : 84) + parcelIndex * 2;
  const travel = motion.ramp(
    frame,
    start,
    motion.scale(20),
    motion.travel.easing,
  );
  const source = getCarrierPositionFromInputAndFrame({
    motion,
    input,
    frame,
    index: boundary,
  });
  const receiver = getCarrierPositionFromInputAndFrame({
    motion,
    input,
    frame,
    index: boundary + 1,
  });
  const mechanism = _getTransferMechanism({ travel, input, boundary });
  return {
    x: Motion.mix({ t: travel, from: source.x, to: receiver.x }) + offset,
    y: 300 - Math.sin(travel * Math.PI) * 78,
    owner: mechanism
      ? "transfer"
      : input.carriers[boundary + (travel === 1 ? 1 : 0)].id,
    mechanism,
  };
}
