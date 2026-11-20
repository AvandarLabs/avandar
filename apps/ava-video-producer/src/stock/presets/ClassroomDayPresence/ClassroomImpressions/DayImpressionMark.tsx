import { match } from "ts-pattern";
import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../ClassroomDayPresence.schema";
import type { ReactNode } from "react";
/** A circle for present, an empty square for absent, a diamond if unknown. */
export function DayImpressionMark({
  state,
  center,
  y,
}: Readonly<{
  state: Input["days"][number]["records"][number]["state"];
  center: number;
  y: number;
}>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return match(state)
    .with("present", () => {
      return (
        <circle cx={center + 7} cy={y} r={5} fill={tokens.color.positive} />
      );
    })
    .with("absent", () => {
      return (
        <StockRect
          x={center + 2}
          y={y - 5}
          width={10}
          height={10}
          fill="none"
          stroke={tokens.color.inactive}
        />
      );
    })
    .with("unknown", () => {
      return (
        <SketchedShape
          shape={{
            kind: "path",
            d: `M ${center + 7} ${y - 6} l 6 6 l -6 6 l -6 -6 Z`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={tokens.color.highlight}
        />
      );
    })
    .exhaustive();
}
