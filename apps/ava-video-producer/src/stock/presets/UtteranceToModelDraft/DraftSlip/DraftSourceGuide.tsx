import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useDraftSlipPresentation } from "./useDraftSlipPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useDraftSlipPresentation>,
  | "source"
  | "x"
  | "y"
  | "tokens"
  | "item"
  | "atomic"
  | "motion"
  | "frame"
  | "start"
  | "duration"
>;
/** Render the draft source guide. */
export function DraftSourceGuide(props: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${props.source.x} ${props.source.y + 10} L${props.x} ${props.y}`,
      }}
      profile={props.tokens.sketch.shape}
      data-source-guide={props.item.id}
      opacity={
        props.atomic.opacity["30"] *
        props.motion.ramp(props.frame, props.start, props.duration)
      }
      stroke={props.tokens.color.inactive}
      fill="none"
    />
  );
}
