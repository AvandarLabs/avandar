import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useReunionInvitationPresentation } from "./useReunionInvitationPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useReunionInvitationPresentation>,
  "input" | "x" | "tokens" | "accent" | "scales"
>;
/** Render the reunion acceptance. */
export function ReunionAcceptance(props: Readonly<Props>): ReactNode {
  return (
    <g>
      <FitText
        text={props.input.invitationLabels.acceptance}
        x={props.x + 14}
        y={270}
        width={168}
        fontSize={12}
        maxLines={3}
        breakLongWords
        normalizeWhitespace
      />
      <g data-acceptance-mark>
        <SketchedShape
          shape={{ kind: "path", d: `M${props.x + 180} 282 l6 6 l12 -17` }}
          profile={props.tokens.sketch.shape}
          fill="none"
          stroke={props.accent}
          strokeWidth={props.scales.stroke(props.tokens.stroke.emphasis)}
        />
      </g>
    </g>
  );
}
