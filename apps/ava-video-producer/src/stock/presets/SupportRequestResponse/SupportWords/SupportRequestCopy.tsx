import { LabelSlots } from "../../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { useSupportWordsPresentation } from "./useSupportWordsPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useSupportWordsPresentation>,
  "motion" | "frame" | "input" | "scales" | "tokens"
>;
/** Render the support request copy. */
export function SupportRequestCopy(props: Readonly<Props>): ReactNode {
  return (
    <g
      data-request-copy="true"
      opacity={
        props.motion.reveal(props.frame, 12) *
        (props.input.showRequestAtHold
          ? 1
          : 1 - props.motion.ramp(props.frame, 130, props.motion.scale(1)))
      }
    >
      <StockRect
        x={60}
        y={55}
        width={390}
        height={126}
        rx={props.scales.corner(props.tokens.corner.panel)}
        fill={props.tokens.color.surface}
        stroke={props.tokens.color.line}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M225 181 l15 18 l15 -18" }}
        profile={props.tokens.sketch.shape}
        fill={props.tokens.color.surface}
        stroke={props.tokens.color.line}
      />
      <LabelSlots labels={[[props.input.requestText, 80, 86, 350, 18, 4]]} />
    </g>
  );
}
