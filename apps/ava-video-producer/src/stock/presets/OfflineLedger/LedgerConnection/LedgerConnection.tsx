import { Motion } from "../../../../motion";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { LedgerConnectionPath } from "./LedgerConnectionPath";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  accent: string;
};

/** The cue the connection arc starts to collapse on. */
const COLLAPSE_CUE = 30;

/** The cue the connection is unavailable on. */
const OFFLINE_CUE = 36;

/**
 * The connection arc collapses at the first entry and stays unavailable during
 * the hold.
 */
export function LedgerConnection({
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  // The arc has collapsed by the cue the connection reads unavailable.
  const connection =
    1 -
    Motion.ramp({
      frame,
      at: COLLAPSE_CUE,
      dur: OFFLINE_CUE - COLLAPSE_CUE,
      easing: motion.exit.easing,
    });
  const isOnline = frame < OFFLINE_CUE;
  return (
    <g data-connection={isOnline ? "available" : "unavailable"}>
      <LedgerConnectionPath
        accent={accent}
        tokens={tokens}
        scales={scales}
        connection={connection}
      />
      <circle
        cx={748}
        cy={130}
        r={3}
        fill={isOnline ? accent : tokens.color.inactive}
      />
      {isOnline ? undefined : (
        <SketchedShape
          shape={{ kind: "path", d: "M740 122 l16 16" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
        />
      )}
    </g>
  );
}
