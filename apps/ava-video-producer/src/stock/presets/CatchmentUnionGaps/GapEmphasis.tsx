import { SketchedShape } from "../../primitives/SketchedShape";
import { StockRect } from "../../primitives/StockRect";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "./CatchmentUnionGaps.schema";
import type { ReactNode } from "react";

type Props = {
  householdId: string;
  railY: number;
  covered: boolean;
  progress: number;
  gapEmphasis: Input["gapEmphasis"];
};
/** Only supplied uncovered homes receive the authored gap treatment. */
export function GapEmphasis({
  householdId,
  railY,
  covered,
  progress,
  gapEmphasis,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <g>
      {" "}
      {!covered ? (
        <g opacity={progress}>
          <StockRect
            data-uncovered-emphasis={householdId}
            x={626}
            y={railY - 11}
            width={24}
            height={24}
            rx={scales.corner(tokens.corner.chip)}
            fill="none"
            stroke={tokens.color.highlight}
          />
          {gapEmphasis === "hatch" ? (
            <SketchedShape
              shape={{
                kind: "path",
                d: `M627 ${railY + 10} l4 -4 M627 ${railY + 2} l4 -4 M644 ${railY + 10} l5 -5 M644 ${railY - 5} l4 -4`,
              }}
              profile={tokens.sketch.shape}
              stroke={tokens.color.highlight}
            />
          ) : undefined}
        </g>
      ) : undefined}
    </g>
  );
}
