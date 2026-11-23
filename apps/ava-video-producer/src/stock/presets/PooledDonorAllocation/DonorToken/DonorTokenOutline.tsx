import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useDonorTokenPresentation } from "./useDonorTokenPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useDonorTokenPresentation>,
  "tokens" | "accent" | "scales"
>;
/** Render the donor token outline. */
export function DonorTokenOutline(props: Readonly<Props>): ReactNode {
  return (
    <SketchedShape
      shape={{ kind: "circle", cx: 0, cy: 0, r: 17 }}
      profile={props.tokens.sketch.shape}
      fill={props.tokens.color.surface}
      stroke={props.accent}
      strokeWidth={props.scales.stroke(props.tokens.stroke.outline)}
    />
  );
}
