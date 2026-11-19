import { mix, ramp } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = { frame: number; accent: string };

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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  // The arc has collapsed by the cue the connection reads unavailable.
  const connection =
    1 -
    ramp(frame, COLLAPSE_CUE, OFFLINE_CUE - COLLAPSE_CUE, motion.exit.easing);
  const isOnline = frame < OFFLINE_CUE;
  return (
    <g data-connection={isOnline ? "available" : "unavailable"}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${mix(connection, 748, 738)} 124 Q748 ${mix(connection, 124, 108)} ${mix(connection, 748, 758)} 124`,
        }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        opacity={connection}
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
