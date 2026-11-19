import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";
/** Inputs for SetbackHatch. */
type Props = { hatchId: string };

/**
 * The retained perimeter band distinguishes clearance from occupied footprint.
 */
export function SetbackHatch({ hatchId }: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  return (
    <defs>
      <pattern id={hatchId} width={8} height={8} patternUnits="userSpaceOnUse">
        <SketchedShape
          shape={{ kind: "path", d: "M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.highlight}
          strokeOpacity={atomic.opacity["45"]}
        />
      </pattern>
    </defs>
  );
}
