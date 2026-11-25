import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useDraftRelationPresentation } from "./useDraftRelationPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useDraftRelationPresentation>,
  "stacked" | "target" | "tokens" | "accent" | "scales"
>;
/** Render the draft relation arrowhead. */
export function DraftRelationArrowhead(props: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: props.stacked
          ? `M324 ${props.target - 5} L314 ${props.target} L324 ${props.target + 5}`
          : `M${props.target - 5} 277 L${props.target} 285 L${props.target + 5} 277`,
      }}
      profile={props.tokens.sketch.shape}
      data-direction-head="true"
      fill="none"
      stroke={props.accent}
      strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
    />
  );
}
