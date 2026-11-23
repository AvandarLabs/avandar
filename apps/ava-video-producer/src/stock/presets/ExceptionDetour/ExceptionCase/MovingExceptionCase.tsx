import { SketchedShape } from "../../../primitives/SketchedShape";
import { RESOLVED_CUE } from "../exceptionTiming";
import { CaseLabel } from "./CaseLabel";
import type { cubicPoint } from "../../../graphics-common/cubicPoint";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Props as ParentProps } from "../ExceptionDetour";
import type { ReactNode } from "react";

type Props = {
  frame: Readonly<ParentProps>["frame"];
  accent: Readonly<ParentProps>["accent"];
  input: Readonly<ParentProps>["input"];
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  point: ReturnType<typeof cubicPoint>;
  x: number | ReturnType<typeof cubicPoint>["x"];
};

/** Renders the moving exception case in authored paint order. */
export function MovingExceptionCase(options: Readonly<Props>): ReactNode {
  return (
    <g
      opacity={options.motion.reveal(options.frame, 24)}
      aria-label={options.input.caseLabel}
    >
      <circle
        data-moving-case="true"
        cx={options.x}
        cy={options.point.y}
        r={8}
        fill={options.accent}
      />
      <SketchedShape
        shape={{ kind: "path", d: "M120 510 V500 H840 V510" }}
        profile={options.tokens.sketch.shape}
        stroke={options.accent}
        fill="none"
        opacity={options.motion.reveal(options.frame, RESOLVED_CUE)}
      />
      <CaseLabel text={options.input.caseLabel} />
    </g>
  );
}
