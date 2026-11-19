import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";
/** How strongly the setback hatching shows. */
const HATCH_OPACITY = 0.45;
/** Inputs for SetbackHatch. */
type Props = { hatchId: string };

/**
 * The retained perimeter band distinguishes clearance from occupied footprint.
 */
export function SetbackHatch({ hatchId }: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <defs>
      <pattern id={hatchId} width={8} height={8} patternUnits="userSpaceOnUse">
        <SketchedShape
          shape={{ kind: "path", d: "M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          strokeOpacity={HATCH_OPACITY}
        />
      </pattern>
    </defs>
  );
}
