import { ramp } from "../../../motion";
import { FitText } from "../../primitives/FitText/FitText";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { STOCK } from "../../stockPalette";
import { getPopulationRateFromCounts } from "./getPopulationRateFromCounts";
import type { Input } from "./PopulationNormalizedMap.schema";
import type { ReactNode } from "react";

type Props = {
  zone: Input["zones"][number];
  index: number;
  input: Input;
  frame: number;
  accent: string;
};
/** Every denominator stays present even when the numerator hold is disabled. */
export function ZoneFraction({
  zone,
  index,
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const y = 170 + index * 80;
  const rate = getPopulationRateFromCounts({
    ...zone,
    rateBase: input.rateBase,
  });
  return (
    <g data-fraction-zone={zone.id}>
      <LabelSlots labels={[[zone.label, 600, y, 340, 12, 1]]} />
      <g opacity={ramp(frame, 36, 36)}>
        {input.keepFractionsVisible || frame < 108 ? (
          <g>
            <LabelSlots
              labels={[[String(zone.records), 655, y + 37, 90, 14, 1]]}
            />
            <line
              x1={640}
              y1={y + 42}
              x2={735}
              y2={y + 42}
              stroke={STOCK.muted}
            />
          </g>
        ) : undefined}
        <LabelSlots
          labels={[[String(zone.population), 655, y + 60, 90, 14, 1]]}
        />
      </g>
      <FitText
        text={String(frame < 72 ? zone.records : rate)}
        x={750}
        y={y + 42}
        width={185}
        fontSize={14}
        maxLines={2}
        color={accent}
        normalizeWhitespace
        breakLongWords
      />
    </g>
  );
}
