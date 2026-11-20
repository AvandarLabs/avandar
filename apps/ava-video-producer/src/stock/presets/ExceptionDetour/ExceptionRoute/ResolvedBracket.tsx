import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { DETOUR_CUE, DETOUR_FRAMES, RESOLVED_CUE } from "../exceptionTiming";
import type { ReactNode } from "react";
/** The bracket that closes around the case once it is resolved. */
export function ResolvedBracket({
  frame,
  targetY,
}: Readonly<{ frame: number; targetY: number }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  return (
    <g data-resolved-bracket="true">
      <SketchedShape
        shape={{
          kind: "path",
          d: `M92 ${targetY - 36} h-12 v114 h12 M922 ${targetY - 36} h12 v114 h-12 M80 516 v62 h854 v-62`,
        }}
        profile={tokens.sketch.shape}
        opacity={motion.reveal(frame, RESOLVED_CUE)}
        stroke={tokens.color.highlight}
        fill="none"
      />
    </g>
  );
}
