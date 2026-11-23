import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  fillHeight: number;
  accent: string;
  atomic: ReturnType<typeof GraphicThemeHooks.useGraphicTheme>["atomic"];
};

/** Renders the battery fill with authored geometry. */
export function BatteryStorageFill({
  x,
  y,
  fillHeight,
  accent,
  atomic,
}: Readonly<Props>): ReactNode {
  return (
    <rect
      data-battery-fill="true"
      x={x + 10}
      y={y + 160 - fillHeight}
      width={144}
      height={fillHeight}
      fill={accent}
      fillOpacity={atomic.opacity["65"]}
    />
  );
}
