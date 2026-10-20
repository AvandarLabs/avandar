import { ramp } from "../../../motion";
import { PhysicalWaterKeys } from "./PhysicalWaterKeys";
import { StorageBasin } from "./StorageBasin";
import { WaterOutlets } from "./WaterOutlets";
import { WaterSpill } from "./WaterSpill";
import type { Input } from "./StormwaterStorageSpill.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** The finite basin retains every physical water destination. */
export function BasinWater({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <g>
      <StorageBasin input={input} frame={frame} />
      <path
        d="M480 135V225"
        stroke={accent}
        strokeWidth={8}
        opacity={1 - ramp(frame, 96, 12)}
      />
      <WaterOutlets input={input} frame={frame} />
      <WaterSpill input={input} frame={frame} />
      <PhysicalWaterKeys input={input} />
    </g>
  );
}
