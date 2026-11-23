import { LabelSlots } from "../../primitives/LabelSlots/LabelSlots";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./LocationUncertaintyBoundary.schema";
import type { ReactNode } from "react";

type Props = {
  location: Input["locations"][number];
  index: number;
  x: number;
  y: number;
  isFocused: boolean;
  accent: string;
};
const CONNECTOR_WIDTH = 0.8;
/**
 * A persistent ring and stronger keyed connector identify the explained record.
 */
export function LocationPin({
  location,
  index,
  x,
  y,
  isFocused,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: isFocused ? 5 : 3 }}
        profile={tokens.sketch.shape}
        data-nominal-pin={location.id}
        fill={isFocused ? accent : tokens.color.text}
        stroke={isFocused ? tokens.color.text : "none"}
        strokeWidth={isFocused ? scales.stroke(tokens.stroke.default) : 0}
      />
      <SketchedShape
        shape={{ kind: "path", d: `M${x} ${y} L420 ${328 + index * 31} H440` }}
        profile={tokens.sketch.shape}
        data-location-connector={location.id}
        fill="none"
        stroke={isFocused ? accent : tokens.color.inactive}
        strokeWidth={scales.stroke(
          isFocused ? tokens.stroke.default : CONNECTOR_WIDTH,
        )}
      />
      <LabelSlots
        labels={[[String(index + 1), 444, 332 + index * 31, 24, 12, 1]]}
      />
    </g>
  );
}
