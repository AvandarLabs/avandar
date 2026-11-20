import { ramp } from "../../../motion";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { OUTCOME_CUE } from "./outboxShape";
import type { Input } from "./AtomicOutboxCommit.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number };
/** Frames the outcome caption takes to fade in. */
const CAPTION_FRAMES = 28;
/** The outcome caption describes both durable halves together. */
export function OutboxOutcome({ input, frame }: Readonly<Props>): ReactNode {
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g
      opacity={ramp(
        frame,
        OUTCOME_CUE,
        motion.scale(CAPTION_FRAMES),
        motion.reveal.easing,
      )}
    >
      <LabelSlots
        labels={[
          [
            input.outcome === "commit"
              ? input.labels.committed
              : input.labels.aborted,
            70,
            550,
            820,
            20,
            2,
          ],
        ]}
      />
    </g>
  );
}
