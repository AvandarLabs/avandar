import { SketchedShape } from "../../primitives/SketchedShape";
import type { useProtectedWorkBoundaryPresentation } from "./useProtectedWorkBoundaryPresentation";
import type { ReactNode } from "react";

type Props = Pick<
  ReturnType<typeof useProtectedWorkBoundaryPresentation>,
  "input" | "id" | "tokens" | "scales"
>;
/** Render the protected boundary pattern. */
export function ProtectedBoundaryPattern(props: Readonly<Props>): ReactNode {
  return (
    <defs>
      <pattern
        id={`${props.id}-protected`}
        width={8}
        height={8}
        patternUnits="userSpaceOnUse"
      >
        {props.input.protectedPattern === "hatch" ? (
          <SketchedShape
            shape={{ kind: "path", d: "M0 8 L8 0" }}
            profile={props.tokens.sketch.shape}
            stroke={props.tokens.color.inactive}
            strokeWidth={props.scales.stroke(props.tokens.stroke.hairline)}
          />
        ) : (
          <circle cx={3} cy={3} r={1.2} fill={props.tokens.color.inactive} />
        )}
      </pattern>
    </defs>
  );
}
