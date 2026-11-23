import { SketchedShape } from "../../primitives/SketchedShape";
import type { useSharedReadingCirclesPresentation } from "./useSharedReadingCirclesPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useSharedReadingCirclesPresentation>,
  "input" | "tokens" | "motion" | "frame" | "scales"
>;
/** Render the reading shelf. */
export function ReadingShelf(props: Readonly<Props>): ReactNode {
  return (
    <g data-reading-shelf={props.input.startingShelf}>
      <SketchedShape
        shape={{
          kind: "path",
          d:
            props.input.startingShelf === "front"
              ? "M65 275 H920 M75 275 V290 M910 275 V290"
              : "M65 228 V440 M65 275 H140 M65 330 H140 M65 385 H140 M65 440 H140",
        }}
        profile={props.tokens.sketch.shape}
        opacity={
          1 -
          props.motion.ramp(
            props.frame,
            94,
            props.motion.scale(14),
            props.motion.exit.easing,
          )
        }
        fill="none"
        stroke={props.tokens.color.line}
        strokeWidth={props.scales.stroke(props.tokens.stroke.emphasis)}
      />
    </g>
  );
}
