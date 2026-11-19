import { mix } from "../../../motion";
import { Text } from "../../graphics-common/Text";
import {
  useGraphicMotion,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { VideoMotion } from "../../../videoTheme/createVideoMotion/createVideoMotion";
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
  motion,
}: Readonly<Pick<Props, "location" | "frame"> & { motion: VideoMotion }>) {
  const progress = motion.ramp(
    frame,
    13,
    motion.scale(57),
    motion.travel.easing,
  );
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
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  const motion = useGraphicMotion();
  const { progress, source, displaced, vector } = _getOffsetGeometry({
    location,
    frame,
    motion,
  });
  return (
    <g>
      {showOriginal ? (
        <circle
          data-local-original={location.id}
          {...source}
          r={5}
          fill={tokens.color.highlight}
        />
      ) : undefined}
      <line
        data-local-offset={location.id}
        {...vector}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
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
