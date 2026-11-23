import { propEq } from "@avandar/utils";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { IncomingPriorityItem } from "./IncomingPriorityItem";
import { PriorityBracket } from "./PriorityBracket";
import { QueuedPriorityItems } from "./QueuedPriorityItems";
import { QueueSlots } from "./QueueSlots";
import { ServiceHeadingAndGuide } from "./ServiceHeadingAndGuide";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./PriorityInsertion.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & {
  input: Input;
};

type InsertionOptions = {
  frame: Readonly<Props>["frame"];
  input: Readonly<Props>["input"];
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
};

type InsertionResult = {
  insertion: number;
  shift: number;
  incoming: number;
  spur: number;
  insertionY: number;
};

/**
 * Samples the priority insertion insertion state for the current authored
 * frame.
 */
function _getPriorityInsertionInsertionState({
  frame,
  input,
  motion,
}: Readonly<InsertionOptions>): InsertionResult {
  const insertion = input.queue.findIndex(propEq("id", input.insertBeforeId));
  const shift = motion.ramp(frame, 64, motion.scale(44), motion.travel.easing);
  const incoming = motion.ramp(
    frame,
    120,
    motion.scale(12),
    motion.travel.easing,
  );
  const spur = motion.ramp(frame, 108, motion.scale(12), motion.travel.easing);
  const insertionY = 190 + 58 * insertion;
  return { insertion, shift, incoming, spur, insertionY };
}

/** Open exactly one queue slot and insert authored work from a side spur. */
export function PriorityInsertion({
  frame,
  input,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const { insertion, shift, incoming, spur, insertionY } =
    _getPriorityInsertionInsertionState({ frame, input, motion });
  const drawing = {
    input,
    accent,
    tokens,
    atomic,
    scales,
    frame,
    motion,
    insertionY,
    insertion,
    shift,
    incoming,
    spur,
  };
  return (
    <g>
      <g opacity={motion.ramp(frame, 12, motion.scale(26))}>
        <ServiceHeadingAndGuide {...drawing} />
        <QueueSlots {...drawing} />
      </g>
      <PriorityBracket {...drawing} />
      <QueuedPriorityItems {...drawing} />
      <IncomingPriorityItem {...drawing} />
    </g>
  );
}
