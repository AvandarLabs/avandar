import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = { state: string; y: number; accent: string };

/** A bracket on a mismatch, a tick on a match, or a mark when unobserved. */
export function StateGlyph({ state, y, accent }: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-state-glyph={state}>
      <SketchedShape
        shape={{
          kind: "path",
          d:
            state === "mismatch"
              ? `M909 ${y - 19} H920 V${y + 57} H909`
              : state === "match"
                ? `M905 ${y + 37} L911 ${y + 43} L925 ${y + 25}`
                : `M915 ${y + 30} V${y + 42} M915 ${y + 48} V${y + 50}`,
        }}
        profile={tokens.sketch.shape}
        stroke={state === "mismatch" ? tokens.color.highlight : accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        fill="none"
      />
    </g>
  );
}
