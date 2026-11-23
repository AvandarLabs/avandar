import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useAliquotTubePresentation } from "./useAliquotTubePresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useAliquotTubePresentation>,
  "x" | "tokens" | "scales"
>;
/** Render the aliquot tube outline. */
export function AliquotTubeOutline(props: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{
        kind: "path",
        d: `M${props.x - 25} 148 V262 Q${props.x - 25} 278 ${props.x} 278 Q${props.x + 25} 278 ${props.x + 25} 262 V148 Z`,
      }}
      profile={props.tokens.sketch.shape}
      fill={props.tokens.color.surface}
      stroke={props.tokens.color.inactive}
      strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
    />
  );
}
