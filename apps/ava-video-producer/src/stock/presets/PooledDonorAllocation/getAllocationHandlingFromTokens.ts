import { propEq, prop } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { Input } from "./PooledDonorAllocation.schema";
type Token = ReturnType<typeof getAllocationTokensFromInputAndFrame>[number];

function _getBatchBounds({
  tokens,
  requestId,
}: Readonly<{ tokens: readonly Token[]; requestId: string }>) {
  const batch = tokens.filter(propEq("requestId", requestId));
  const left = Math.min(...batch.map(prop("x"))) - 23;
  const right = Math.max(...batch.map(prop("x"))) + 23;
  const top = Math.min(...batch.map(prop("y"))) - 22;
  const bottom = Math.max(...batch.map(prop("y"))) + 24;
  return { right, bottom, width: right - left, height: bottom - top };
}

function _getPreviousScoop({
  input,
  index,
  batch,
}: Readonly<{
  input: Input;
  index: number;
  batch: ReturnType<typeof _getBatchBounds>;
}>) {
  if (index === 0) {
    return { ...batch, right: 893, bottom: 355 };
  }
  const previous = _getBatchBounds({
    tokens: getAllocationTokensFromInputAndFrame({ input, frame: 150 }),
    requestId: input.requests[index - 1].id,
  });
  return { ...previous, bottom: previous.bottom + 26 };
}
/** Data for getAllocationHandlingFromTokens. */
type GetAllocationHandlingResult = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  bodyX: number;
  bodyY: number;
  handX: number;
  handY: number;
  opacity: number;
};

/**
 * The empty scoop resizes while repositioning, then rigidly carries its batch.
 */
export function getAllocationHandlingFromTokens({
  input,
  frame,
  tokens,
}: Readonly<{
  input: Input;
  frame: number;
  tokens: readonly Token[];
}>): GetAllocationHandlingResult {
  const index = Math.max(
    0,
    Math.min(input.requests.length - 1, Math.floor((frame - 62) / 20)),
  );
  const start = 62 + index * 20;
  const batch = _getBatchBounds({
    tokens,
    requestId: input.requests[index].id,
  });
  const pickup = ramp(frame, start, 1);
  const lift = ramp(frame, start + 1, 1);
  const release = ramp(frame, start + 16, 4);
  const previous = _getPreviousScoop({ input, index, batch });
  const handX = mix(pickup, previous.right, batch.right);
  const handY = mix(lift, previous.bottom, batch.bottom + release * 26);
  const retreat = ramp(frame, 62 + input.requests.length * 20, 10);
  return {
    left: handX - mix(pickup, previous.width, batch.width),
    right: handX,
    top: handY - mix(pickup, previous.height, batch.height),
    bottom: handY,
    bodyX: mix(retreat, handX + 32, 925),
    bodyY: mix(retreat, Math.max(352, handY - 32), 345),
    handX: mix(retreat, handX, 913),
    handY: mix(retreat, handY, 355),
    opacity: (1 - retreat) * ramp(frame, 60, 2),
  };
}
