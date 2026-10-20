import { ramp, mix, EASE } from "../../../motion";
import { Text } from "../../graphics-common";
import { STOCK } from "../../stockPalette";
import type { Input } from "./BoundedLocationDisplacement.schema";
import type { ReactNode } from "react";
type Props = {
  location: Input["locations"][number];
  index: number;
  showOriginal: boolean;
  frame: number;
  accent: string;
};
function _getOffsetGeometry({
  location,
  frame,
}: Readonly<Pick<Props, "location" | "frame">>) {
  const progress = ramp(frame, 13, 57, EASE.inOut);
  const source = { cx: 60 + location.x * 3.2, cy: 180 + location.y * 2.2 };
  const displaced = {
    cx: 60 + (location.x + location.offsetX) * 3.2,
    cy: 180 + (location.y + location.offsetY) * 2.2,
  };
  const vector = {
    x1: source.cx,
    y1: source.cy,
    x2: mix(progress, source.cx, displaced.cx),
    y2: mix(progress, source.cy, displaced.cy),
  };
  return { progress, source, displaced, vector };
}
/** Bounded vector and source identity remain inside the retained local map. */
export function LocalOffsetMarker({
  location,
  index,
  showOriginal,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { progress, source, displaced, vector } = _getOffsetGeometry({
    location,
    frame,
  });
  return (
    <g>
      {showOriginal ? (
        <circle
          data-local-original={location.id}
          {...source}
          r={5}
          fill={STOCK.orange}
        />
      ) : undefined}
      <line
        data-local-offset={location.id}
        {...vector}
        stroke={accent}
        strokeWidth={2}
        opacity={progress}
      />
      <circle
        {...displaced}
        r={7}
        fill="none"
        stroke={accent}
        opacity={progress}
      />
      <Text x={displaced.cx} y={displaced.cy + 4} size={12}>
        {index + 1}
      </Text>
    </g>
  );
}
