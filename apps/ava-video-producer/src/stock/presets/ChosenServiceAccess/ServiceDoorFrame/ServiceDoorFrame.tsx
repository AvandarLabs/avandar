import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ChosenServiceAccess.schema";
import type { ReactNode } from "react";

type Props = {
  service: Input["services"][number];
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  x: number;
  selected: boolean;
  change: number;
  threshold: number;
};
/** Draws the service enclosure and opening selected door. */
export function ServiceDoorFrame({
  service,
  accent,
  tokens,
  scales,
  x,
  selected,
  change,
  threshold,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <StockRect
        x={x - 68}
        y={194}
        width={136}
        height={threshold - 180}
        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        stroke={tokens.color.line}
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x - 42} ${threshold} V214 H${x + 42} V${threshold}`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
        fill="none"
      />
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 42} 214 L${x + 42 - 68 * (1 - change)} ${214 + change * 10} V${threshold} H${x + 42}`,
        }}
        profile={tokens.sketch.shape}
        data-door={service.id}
        fill={tokens.color.surface}
        stroke={selected ? accent : tokens.color.inactive}
      />
    </>
  );
}
