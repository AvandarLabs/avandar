import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import { Text } from "./Text";
import type { ReactNode } from "react";

type Props = { children: ReactNode; x?: number; y?: number; fill?: string };
/** The small tracked label at the theme's eyebrow origin. */
export function Eyebrow({ children, x, y, fill }: Readonly<Props>): ReactNode {
  const origin =
    GraphicThemeHooks.useGraphicTokens().layout.graphic.eyebrowOrigin;
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
