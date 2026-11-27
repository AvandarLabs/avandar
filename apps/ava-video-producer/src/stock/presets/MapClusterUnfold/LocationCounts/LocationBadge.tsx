import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { LocationCountsShared } from "./LocationCountsShared/LocationCountsShared";
import type { ReactNode } from "react";

type Props = {
  location: ReturnType<typeof LocationCountsShared.getLocations>[number];
  accent: string;
};

/** A location's member count in a ring at its shared position. */
export function LocationBadge({
  location,
  accent,
}: Readonly<Props>): ReactNode {
  const { color, stroke, sketch, text } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g data-location-count={location.numMembers}>
      <SketchedShape
        shape={{ kind: "circle", cx: location.x, cy: location.y, r: 14 }}
        profile={sketch.shape}
        fill={color.elevated}
        stroke={accent}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <text
        x={location.x}
        y={location.y + 4}
        textAnchor="middle"
        fontSize={text.graphic.data.fontSize}
        fontWeight={text.graphic.data.fontWeight}
        fill={text.graphic.data.color}
      >
        {location.numMembers}
      </text>
    </g>
  );
}
