import { propEq, prop } from "@avandar/utils";
import { Motion } from "../../../motion";
import { getAllocationTokensFromInputAndFrame } from "./getAllocationTokensFromInputAndFrame";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./PooledDonorAllocation.schema";

type GetPreviousScoopOptions = {
  input: Input;
  index: number;
  batch: ReturnType<typeof _getBatchBounds>;
  motion: VideoMotion;
};

type Token = ReturnType<typeof getAllocationTokensFromInputAndFrame>[number];

type BatchOptions = {
  input: AllocationHandlingArgs["input"];
  frame: AllocationHandlingArgs["frame"];
  tokens: AllocationHandlingArgs["tokens"];
  motion: AllocationHandlingArgs["motion"];
  index: number;
};

type BatchResult = {
  batch: ReturnType<typeof _getBatchBounds>;
  pickup: ReturnType<typeof _getHandlingPhases>["pickup"];
  previous: ReturnType<typeof _getPreviousScoop>;
  handX: number;
  handY: number;
  retreat: number;
};

type ActiveHandlingOptions = {
  input: AllocationHandlingArgs["input"];
  frame: AllocationHandlingArgs["frame"];
  tokens: AllocationHandlingArgs["tokens"];
  motion: AllocationHandlingArgs["motion"];
};

type ActiveHandlingResult = {
  batch: BatchResult["batch"];
  pickup: BatchResult["pickup"];
  previous: BatchResult["previous"];
  handX: BatchResult["handX"];
  handY: BatchResult["handY"];
  retreat: BatchResult["retreat"];
};

type GetAllocationHandlingFromTokensLeftAndRightAndTopOptions = {
  batch: ActiveHandlingResult["batch"];
  pickup: ActiveHandlingResult["pickup"];
  previous: ActiveHandlingResult["previous"];
  handX: ActiveHandlingResult["handX"];
  handY: ActiveHandlingResult["handY"];
  retreat: ActiveHandlingResult["retreat"];
};

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

type AllocationHandlingArgs = Readonly<{
  input: Input;
  frame: number;
  tokens: readonly Token[];
  motion: VideoMotion;
}>;

/** Samples the left, right, top, bottom, bodyX, bodyY geometry fields. */
function _getAllocationHandlingFromTokensLeftAndRightAndTop({
  batch,
  pickup,
  previous,
  handX,
  handY,
  retreat,
}: Readonly<GetAllocationHandlingFromTokensLeftAndRightAndTopOptions>): Pick<
  ReturnType<typeof getAllocationHandlingFromTokens>,
  "left" | "right" | "top" | "bottom" | "bodyX" | "bodyY"
> {
  return {
    left:
      handX -
      Motion.mix({
        t: pickup,
        from: previous.width,
        to: batch.width,
      }),
    right: handX,
    top:
      handY -
      Motion.mix({
        t: pickup,
        from: previous.height,
        to: batch.height,
      }),
    bottom: handY,
    bodyX: Motion.mix({
      t: retreat,
      from: handX + 32,
      to: 925,
    }),
    bodyY: Motion.mix({
      t: retreat,
      from: Math.max(352, handY - 32),
      to: 345,
    }),
  };
}

function _getBatchBounds({
  tokens,
  requestId,
}: Readonly<{
  tokens: readonly Token[];
  requestId: string;
}>) {
  const batch = tokens.filter(propEq("requestId", requestId));
  const left = Math.min(...batch.map(prop("x"))) - 23;
  const right = Math.max(...batch.map(prop("x"))) + 23;
  const top = Math.min(...batch.map(prop("y"))) - 22;
  const bottom = Math.max(...batch.map(prop("y"))) + 24;
  return { right, bottom, width: right - left, height: bottom - top };
}

/** The scoop's pickup, lift, and release for one batch, each 0 to 1. */
function _getHandlingPhases({
  frame,
  start,
  motion,
}: Readonly<{
  frame: number;
  start: number;
  motion: VideoMotion;
}>) {
  return {
    pickup: motion.ramp(frame, start, motion.scale(1), motion.entrance.easing),
    lift: motion.ramp(
      frame,
      start + 1,
      motion.scale(1),
      motion.entrance.easing,
    ),
    release: motion.ramp(
      frame,
      start + 16,
      motion.press.duration,
      motion.entrance.easing,
    ),
  };
}

function _getPreviousScoop({
  input,
  index,
  batch,
  motion,
}: Readonly<GetPreviousScoopOptions>) {
  if (index === 0) {
    return { ...batch, right: 893, bottom: 355 };
  }
  const previous = _getBatchBounds({
    tokens: getAllocationTokensFromInputAndFrame({ input, frame: 150, motion }),
    requestId: input.requests[index - 1].id,
  });
  return { ...previous, bottom: previous.bottom + 26 };
}

/**
 * Samples the allocation handling from tokens batch state for the current
 * authored frame.
 */
function _getAllocationHandlingFromTokensBatchState({
  input,
  frame,
  tokens,
  motion,
  index,
}: Readonly<BatchOptions>): BatchResult {
  const start = 62 + index * motion.scaleStagger(20);
  const batch = _getBatchBounds({
    tokens,
    requestId: input.requests[index].id,
  });
  const { pickup, lift, release } = _getHandlingPhases({
    frame,
    start,
    motion,
  });
  const previous = _getPreviousScoop({ input, index, batch, motion });
  const handX = Motion.mix({
    t: pickup,
    from: previous.right,
    to: batch.right,
  });
  const handY = Motion.mix({
    t: lift,
    from: previous.bottom,
    to: batch.bottom + release * 26,
  });
  const retreat = motion.ramp(
    frame,
    62 + input.requests.length * motion.scaleStagger(20),
    motion.scale(10),
    motion.entrance.easing,
  );
  return { batch, pickup, previous, handX, handY, retreat };
}

/** Samples the active allocation handling for the current authored frame. */
function _getActiveAllocationHandling({
  input,
  frame,
  tokens,
  motion,
}: Readonly<ActiveHandlingOptions>): ActiveHandlingResult {
  const index = Math.max(
    0,
    Math.min(input.requests.length - 1, Math.floor((frame - 62) / 20)),
  );
  const { batch, pickup, previous, handX, handY, retreat } =
    _getAllocationHandlingFromTokensBatchState({
      input,
      frame,
      tokens,
      motion,
      index,
    });
  return { batch, pickup, previous, handX, handY, retreat };
}

/**
 * The empty scoop resizes while repositioning, then rigidly carries its batch.
 */
export function getAllocationHandlingFromTokens({
  input,
  frame,
  tokens,
  motion,
}: AllocationHandlingArgs): GetAllocationHandlingResult {
  const { batch, pickup, previous, handX, handY, retreat } =
    _getActiveAllocationHandling({
      input,
      frame,
      tokens,
      motion,
    });
  return {
    ..._getAllocationHandlingFromTokensLeftAndRightAndTop({
      batch,
      pickup,
      previous,
      handX,
      handY,
      retreat,
    }),
    handX: Motion.mix({
      t: retreat,
      from: handX,
      to: 913,
    }),
    handY: Motion.mix({
      t: retreat,
      from: handY,
      to: 355,
    }),
    opacity:
      (1 - retreat) *
      motion.ramp(frame, 60, motion.scale(2), motion.entrance.easing),
  };
}
