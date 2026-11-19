import { useGraphicTokens } from "../theme/useGraphicTheme/useGraphicTheme";
import { Text } from "./Text";
import type { ReactNode } from "react";

/** The small tracked label at the theme's eyebrow origin. */
export function Eyebrow({
  children,
  x,
  y,
  fill,
}: {
  children: ReactNode;
  x?: number;
  y?: number;
  fill?: string;
}): ReactNode {
  const origin = useGraphicTokens().layout.graphic.eyebrowOrigin;
  return (
    <Text
      role="eyebrow"
      x={x ?? origin.x ?? 0}
      y={y ?? origin.y ?? 0}
      fill={fill}
    >
      {children}
    </Text>
  );
}
