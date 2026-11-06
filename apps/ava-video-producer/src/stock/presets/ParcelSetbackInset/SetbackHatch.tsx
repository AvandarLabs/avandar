import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";
/** Inputs for SetbackHatch. */
type Props = { hatchId: string };

/**
 * The retained perimeter band distinguishes clearance from occupied footprint.
 */
export function SetbackHatch({ hatchId }: Readonly<Props>): ReactNode {
  return (
    <defs>
      <pattern id={hatchId} width={8} height={8} patternUnits="userSpaceOnUse">
        <path
          d="M-2 2 L2 -2 M0 8 L8 0 M6 10 L10 6"
          stroke={STOCK.orange}
          strokeOpacity={0.45}
        />
      </pattern>
    </defs>
  );
}
