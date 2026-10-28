import { mix, ramp, EASE } from "../../../motion";
import { STOCK } from "../../stockPalette";
import { LandSteward } from "./LandSteward";
import type { Input } from "./ContourSedimentRetention.schema";
import type { ReactNode } from "react";

type Props = { input: Input; frame: number; accent: string };
/** A steward carries the selected barrier into contact with the slope. */
export function ContourTreatment({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const place = ramp(frame, 36, 24, EASE.inOut);
  const x = mix(place, 300, 510);
  const y = mix(place, 155, 275);
  return (
    <g>
      <rect
        data-treatment="physical"
        x={x}
        y={y}
        width={24}
        height={65}
        fill={input.intervention.kind === "stone-bund" ? STOCK.muted : accent}
        fillOpacity={0.35}
        stroke={accent}
      />
      {input.intervention.kind === "vegetated-strip" ? (
        <path
          d={`M${x + 12} ${y + 55}V${y - 14}M${x + 12} ${y + 10}l-16 -20M${x + 12} ${y + 28}l20 -20`}
          fill="none"
          stroke={accent}
          strokeWidth={3}
        />
      ) : (
        <path
          d={`M${x} ${y + 20}h24M${x} ${y + 43}h24`}
          stroke={STOCK.text}
          strokeWidth={2}
        />
      )}
      <LandSteward x={x} y={y} accent={accent} />
    </g>
  );
}
