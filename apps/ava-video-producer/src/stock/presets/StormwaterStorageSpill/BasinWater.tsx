import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <StorageBasin input={input} frame={frame} />
      <SketchedShape
        shape={{ kind: "path", d: "M480 135V225" }}
        profile={tokens.sketch.shape}
        stroke={accent}
        strokeWidth={scales.stroke(8)}
        opacity={1 - motion.reveal(frame, 96)}
      />
      <WaterOutlets input={input} frame={frame} />
      <WaterSpill input={input} frame={frame} />
      <PhysicalWaterKeys input={input} />
    </g>
  );
}
