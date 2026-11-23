import { Motion } from "../../../../motion";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ArrivingBatchMember } from "./ArrivingBatchMember";
import type { Input } from "../BatchRelease.schema";
import type { ReactNode } from "react";

type Props = {
  item: Input["batches"][number]["items"][number];
  batchId: string;
  index: number;
  numItems: number;
  frame: number;
  start: number;
  completeAt: number;
  envelopeX: number;
  y: number;
  showLabel: boolean;
  accent: string;
};

type ArrivalOptions = {
  index: Readonly<Props>["index"];
  numItems: Readonly<Props>["numItems"];
  frame: Readonly<Props>["frame"];
  start: Readonly<Props>["start"];
  completeAt: Readonly<Props>["completeAt"];
  envelopeX: Readonly<Props>["envelopeX"];
  y: Readonly<Props>["y"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type ArrivalResult = {
  arriveAt: number;
  x: number;
  tokenY: number;
};

/** Frames a member takes to drop into its slot. */
const SETTLE_FRAMES = 12;

/** Samples the batch member arrive at state for the current authored frame. */
function _getBatchMemberArriveAtState({
  index,
  numItems,
  frame,
  start,
  completeAt,
  envelopeX,
  y,
  motion,
}: Readonly<ArrivalOptions>): ArrivalResult {
  const settle = motion.scale(SETTLE_FRAMES);
  const arriveAt =
    start + (index * (completeAt - start - settle)) / (numItems - 1);
  const progress = Motion.ramp({
    frame,
    at: arriveAt,
    dur: settle,
    easing: motion.travel.easing,
  });
  const x = envelopeX + 15 + index * 110;
  const tokenY = Motion.mix({
    t: progress,
    from: y - 45,
    to: y + 62,
  });
  return { arriveAt, x, tokenY };
}

/** One supplied member remains visible inside its own handling boundary. */
export function BatchMember({
  item,
  batchId,
  index,
  numItems,
  frame,
  start,
  completeAt,
  envelopeX,
  y,
  showLabel,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  // The last member lands exactly as the batch completes.
  const { arriveAt, x, tokenY } = _getBatchMemberArriveAtState({
    index,
    numItems,
    frame,
    start,
    completeAt,
    envelopeX,
    y,
    motion,
  });
  return (
    <ArrivingBatchMember
      item={item}
      batchId={batchId}
      frame={frame}
      showLabel={showLabel}
      accent={accent}
      tokens={tokens}
      scales={scales}
      motion={motion}
      arriveAt={arriveAt}
      x={x}
      tokenY={tokenY}
    />
  );
}
