import { STOCK } from "../../stockPalette";
import type { Input } from "./CapabilityMatrix.schema";
import type { ReactNode } from "react";

type State = Input["capabilities"][number]["cells"][number]["state"];
const GLYPHS: Record<State, { path: string; color: string }> = {
  included: { path: "M-7 0 l5 5 10 -12", color: STOCK.mint },
  absent: { path: "M-7 0 H7", color: STOCK.muted },
  conditional: {
    path: "M0 -8 L8 7 H-8 Z M0 -3 V1 M0 4 V5",
    color: STOCK.orange,
  },
  unknown: {
    path: "M-6 -5 C-6 -12 8 -12 7 -4 C7 0 0 0 0 4 M0 8 V9",
    color: STOCK.cyan,
  },
};
/** Inputs for CapabilityGlyph. */
type Props = { state: State; x: number; y: number };

/** Four authored categorical meanings use four independent path silhouettes. */
export function CapabilityGlyph({ state, x, y }: Readonly<Props>): ReactNode {
  return (
    <g data-state-glyph={state} transform={`translate(${x} ${y})`}>
      <path
        d={GLYPHS[state].path}
        fill="none"
        stroke={GLYPHS[state].color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
}
