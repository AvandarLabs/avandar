import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  motion: ReturnType<typeof GraphicThemeHooks.useGraphicMotion>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  replacement: number;
};
/** Moves the old and replacement parts through their handoff. */
export function RemedyReplacementPart({
  frame,
  tokens,
  motion,
  scales,
  replacement,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${Motion.mix({ t: replacement, from: 560, to: 615 })} ${Motion.mix({ t: replacement, from: 322, to: 410 })} l-10 16`,
        }}
        profile={tokens.sketch.shape}
        data-old-part="retained"
        stroke={tokens.color.highlight}
        strokeWidth={scales.stroke(6)}
      />
      <rect
        data-replacement-part="worker"
        x={Motion.mix({ t: replacement, from: 730, to: 550 })}
        y={Motion.mix({ t: replacement, from: 365, to: 321 })}
        width={24}
        height={18}
        rx={scales.corner(3)}
        fill={tokens.color.accentAlt}
        opacity={motion.ramp(frame, 44, motion.whip)}
      />
    </>
  );
}
