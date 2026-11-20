import { FitText } from "../../primitives/FitText/FitText";
import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
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
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const y = 170 + index * 80;
  const rate = getPopulationRateFromCounts({
    ...zone,
    rateBase: input.rateBase,
  });
  return (
    <g data-fraction-zone={zone.id}>
      <LabelSlots labels={[[zone.label, 600, y, 340, 12, 1]]} />
      <g
        opacity={motion.ramp(frame, 36, motion.scale(36), motion.reveal.easing)}
      >
        {input.keepFractionsVisible || frame < 108 ? (
          <g>
            <LabelSlots
              labels={[[String(zone.records), 655, y + 37, 90, 14, 1]]}
            />
            <SketchedShape
              shape={{ kind: "line", x1: 640, y1: y + 42, x2: 735, y2: y + 42 }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.inactive}
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
