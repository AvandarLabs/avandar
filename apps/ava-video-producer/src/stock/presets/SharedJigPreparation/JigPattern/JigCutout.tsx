import { SketchedShape } from "../../../primitives/SketchedShape";
import type { useJigPatternPresentation } from "./useJigPatternPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useJigPatternPresentation>,
  "body" | "pattern" | "holes" | "notch" | "tokens" | "color" | "scales"
>;
/** Render the jig cutout. */
export function JigCutout(props: Readonly<Props>): ReactNode {
  return (
    <g fillRule="evenodd">
      <SketchedShape
        shape={{
          kind: "path",
          d: `${props.body} ${props.pattern === "two-holes" ? props.holes : props.notch}`,
        }}
        profile={props.tokens.sketch.shape}
        data-guide-body="true"
        fill={props.tokens.color.elevated}
        stroke={props.color}
        strokeWidth={props.scales.stroke(props.tokens.stroke.default)}
      />
    </g>
  );
}
