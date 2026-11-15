import { WaterDestinationKey } from "./WaterDestinationKey";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";
/** Inputs for PhysicalWaterKeys. */
type Props = { input: Input };

/**
 * Zero-share destinations retain their location key without inventing water.
 */
export function PhysicalWaterKeys({ input }: Readonly<Props>): ReactNode {
  return (
    <g>
      <WaterDestinationKey
        destination="infiltration"
        location="physical"
        x={112}
        y={390}
      />
      <WaterDestinationKey
        destination="discharge"
        location="physical"
        x={632}
        y={390}
      />
      <WaterDestinationKey
        destination="detained"
        location="physical"
        x={600}
        y={392}
      />
      <WaterDestinationKey
        destination="overflow"
        location="physical"
        x={input.overflowSide === "left" ? 37 : 837}
        y={390}
      />
    </g>
  );
}
