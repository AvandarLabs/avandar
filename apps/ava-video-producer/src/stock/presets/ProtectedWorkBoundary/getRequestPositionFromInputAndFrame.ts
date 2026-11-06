import { propEq } from "@avandar/utils";
import { EASE, mix, ramp } from "../../../motion";
import type { Input } from "./ProtectedWorkBoundary.schema";
/** Data for getRequestPositionFromInputAndFrame. */
type GetRequestPositionResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/**
 * Request travels above protected time before landing at its authored target.
 */
export function getRequestPositionFromInputAndFrame({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): GetRequestPositionResult {
  const width = 860 / input.slots.length - 4;
  const requested =
    50 +
    (input.slots.findIndex(propEq("id", input.request.requestedSlotId)) * 860) /
      input.slots.length +
    2;
  const destination =
    input.request.placement === "defer"
      ? 660
      : 50 +
        (input.slots.findIndex(
          propEq<{ id: unknown }, "id", unknown>(
            "id",
            input.request.agreedSlotId,
          ),
        ) *
          860) /
          input.slots.length +
        2;
  const approach = ramp(frame, 39, 21, EASE.inOut),
    lift = ramp(frame, 60, 16, EASE.inOut);
  const travel = ramp(frame, 77, 28, EASE.inOut),
    land = ramp(frame, 105, 25, EASE.inOut);
  return {
    x: mix(travel, mix(approach, 270, requested), destination),
    y: mix(
      land,
      mix(lift, 90, 60),
      input.request.placement === "defer" ? 85 : 400,
    ),
    width: Math.min(width, 240),
    height: 90,
  };
}
