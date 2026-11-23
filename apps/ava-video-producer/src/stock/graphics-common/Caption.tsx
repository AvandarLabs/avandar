import { GraphicThemeHooks } from "../theme/GraphicThemeHooks/GraphicThemeHooks";
import { GRAPHIC_HEIGHT, GRAPHIC_WIDTH } from "./graphicCanvas.constants";
import { Text } from "./Text";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  x?: number;
  anchor?: "start" | "middle" | "end";
};

/**
 * The one-line caption, centred on the canvas at the theme's caption baseline.
 */
export function Caption({
  children,
  x = GRAPHIC_WIDTH / 2,
  anchor = "middle",
}: Readonly<Props>): ReactNode {
  const baseline =
    GraphicThemeHooks.useGraphicTokens().layout.graphic.captionBaseline;
  return (
    <Text role="caption" x={x} y={GRAPHIC_HEIGHT - baseline} anchor={anchor}>
      {children}
    </Text>
  );
}
