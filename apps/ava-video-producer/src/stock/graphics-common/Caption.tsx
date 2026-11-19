import { useGraphicTokens } from "../theme/useGraphicTheme/useGraphicTheme";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "./graphicCanvas.constants";
import { Text } from "./Text";
import type { ReactNode } from "react";

/**
 * The one-line caption, centred on the canvas at the theme's caption baseline.
 */
export function Caption({
  children,
  x = GRAPHIC_WIDTH / 2,
  anchor = "middle",
}: {
  children: ReactNode;
  x?: number;
  anchor?: "start" | "middle" | "end";
}): ReactNode {
  const baseline = useGraphicTokens().layout.graphic.captionBaseline;
  return (
    <Text role="caption" x={x} y={GRAPHIC_HEIGHT - baseline} anchor={anchor}>
      {children}
    </Text>
  );
}
