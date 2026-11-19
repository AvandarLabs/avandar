import { Text } from "../../graphics-common/Text";
import {
  useGraphicMotion,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { Input } from "./BoundedLocationDisplacement.schema";
import type { ReactNode } from "react";

type Props = {
  location: Input["locations"][number];
  index: number;
  frame: number;
  accent: string;
};
/** Disclosure begins at the final displaced coordinates and never travels. */
export function DisclosedMarker({
  location,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const center = {
    cx: 500 + (location.x + location.offsetX) * 3.8,
    cy: 180 + (location.y + location.offsetY) * 2.2,
  };
  return (
    <g opacity={motion.reveal(frame, 70 + index * 2)}>
      <circle
        data-public-position={location.id}
        data-public-coordinate={`${location.x + location.offsetX},${location.y + location.offsetY}`}
        {...center}
        r={8}
        fill={accent}
      />
      <Text
        x={center.cx}
        y={center.cy + 4}
        role="data"
        fill={tokens.color.ground}
        anchor="middle"
      >
        {index + 1}
      </Text>
    </g>
  );
}
