import { GlobeProjection } from "../../../geography/GlobeProjection/GlobeProjection";
import { FitText } from "../../../primitives/FitText/FitText";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GlobeContext } from "./GlobeContext";
import type { Input } from "../EnvironmentalObservationGaps.schema";
import type { ReactNode } from "react";
/** Inputs for ObservationContext. */
type Props = { input: Input };
/**
 * Pinned continental geometry provides context without locating the detached
 * tile.
 */
export function ObservationContext({ input }: Readonly<Props>): ReactNode {
  const labels = [
    { text: input.metric.label, x: 32, y: 27, width: 300 },
    { text: input.metric.unit, x: 350, y: 27, width: 150 },
    { text: input.metric.periodLabel, x: 520, y: 27, width: 408 },
    { text: input.copy.map, x: 270, y: 83, width: 650 },
  ];
  return (
    <g>
      {labels.map(({ text, x, y, width }) => {
        return (
          <FitText
            key={`${x}:${y}`}
            text={text}
            x={x}
            y={y}
            width={width}
            fontSize={12}
            maxLines={3}
            breakLongWords
            normalizeWhitespace
          />
        );
      })}
      {input.context === "globe-and-schematic-tile" ? (
        <GlobeContext />
      ) : undefined}
    </g>
  );
}
