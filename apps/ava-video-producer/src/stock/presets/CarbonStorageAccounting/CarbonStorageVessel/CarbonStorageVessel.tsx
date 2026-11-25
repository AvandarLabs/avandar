import { SketchedShape } from "../../../primitives/SketchedShape";
import { StockRect } from "../../../primitives/StockRect";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { Input } from "../CarbonStorageAccounting.schema";
import type { ReactNode } from "react";

const VESSEL_TINT_FLOOR = 0.04;
const VESSEL_TINT_RANGE = 0.12;
type Props = {
  input: Input;
  accent: string;
  tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
  scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
  transfer: number;
  retainedShare: number;
};
/** Draws the storage context and vessel tint for retained carbon. */
export function CarbonStorageVessel({
  input,
  accent,
  tokens,
  scales,
  transfer,
  retainedShare,
}: Readonly<Props>): ReactNode {
  return (
    <>
      {input.view === "cutaway" ? (
        <SketchedShape
          shape={{ kind: "path", d: "M245 435 H474 M245 535 H474" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.line}
        />
      ) : (
        <SketchedShape
          shape={{ kind: "path", d: "M275 520 V535 M445 520 V535" }}
          profile={tokens.sketch.shape}
          stroke={tokens.color.inactive}
          strokeWidth={scales.stroke(tokens.stroke.heavy)}
        />
      )}
      <StockRect
        data-storage-vessel={input.view}
        x={275}
        y={438}
        width={170}
        height={82}
        rx={scales.corner(22)}
        fill={accent}
        fillOpacity={scales.wash(
          VESSEL_TINT_FLOOR + VESSEL_TINT_RANGE * transfer * retainedShare,
        )}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
      />
    </>
  );
}
