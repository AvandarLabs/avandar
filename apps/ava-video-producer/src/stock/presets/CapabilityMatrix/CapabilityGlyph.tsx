import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type State = Input["capabilities"][number]["cells"][number]["state"];
type ColorRole = "positive" | "inactive" | "highlight" | "accentAlt";
const GLYPHS: Record<State, { path: string; color: ColorRole }> = {
  included: { path: "M-7 0 l5 5 10 -12", color: "positive" },
  absent: { path: "M-7 0 H7", color: "inactive" },
  conditional: {
    path: "M0 -8 L8 7 H-8 Z M0 -3 V1 M0 4 V5",
    color: "highlight",
  },
  unknown: {
    path: "M-6 -5 C-6 -12 8 -12 7 -4 C7 0 0 0 0 4 M0 8 V9",
    color: "accentAlt",
  },
};
/** Inputs for CapabilityGlyph. */
type Props = { state: State; x: number; y: number };

/** Four authored categorical meanings use four independent path silhouettes. */
export function CapabilityGlyph({ state, x, y }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <g data-state-glyph={state} transform={`translate(${x} ${y})`}>
      <SketchedShape
        shape={{ kind: "path", d: GLYPHS[state].path }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color[GLYPHS[state].color]}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
