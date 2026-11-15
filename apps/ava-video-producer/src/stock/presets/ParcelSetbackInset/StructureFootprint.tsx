import { EASE, ramp } from "../../../motion";
import { DimensionTicks } from "./DimensionTicks";
import type { Input } from "./ParcelSetbackInset.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/**
 * The whole authored footprint lowers without rotation or automatic resizing.
 */
export function StructureFootprint({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const placement = ramp(frame, 84, 24, EASE.inOut);
  const x = 70 + (input.placement.centerX - input.structure.width / 2) * 4.8;
  const y =
    160 +
    (input.placement.centerY - input.structure.height / 2) * 2.8 -
    32 * (1 - placement);
  const width = input.structure.width * 4.8;
  const height = input.structure.height * 2.8;
  return (
    <g opacity={ramp(frame, 78, 6)}>
      <rect
        data-structure-footprint=""
        x={x}
        y={y}
        width={width}
        height={height}
        fill={accent}
        fillOpacity={0.32}
        stroke={accent}
        strokeWidth={2}
      />
      {input.showDimensions ? (
        <DimensionTicks
          x={x}
          y={y}
          width={width}
          height={height}
          marker="structure"
          side="inside"
        />
      ) : undefined}
    </g>
  );
}
