import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { makePublicCellsFromInput } from "./makePublicCellsFromInput";
import type { Input } from "./MinimumCountMapSuppression.schema";
import type { ReactNode } from "react";

type Props = {
  status: ReturnType<typeof makePublicCellsFromInput>[number]["status"];
  labels: Input["labels"];
  x: number;
  y: number;
};
/** Distinct graphical states carry only permitted accessible public copy. */
export function PublicCellSymbol({
  status,
  labels,
  x,
  y,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  return status === "suppressed" ? (
    <g aria-label={labels.suppressed}>
      <SketchedShape
        shape={{
          kind: "path",
          d: `M${x + 68} ${y + 62} l34 18 M${x + 102} ${y + 62} l-34 18 M${x + 70} ${y + 60} v24 M${x + 80} ${y + 60} v24 M${x + 90} ${y + 60} v24 M${x + 100} ${y + 60} v24`,
        }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.highlight}
      />
    </g>
  ) : status === "missing" ? (
    <g aria-label={labels.missing}>
      <SketchedShape
        shape={{ kind: "path", d: `M${x + 72} ${y + 76} h26` }}
        profile={tokens.sketch.shape}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.emphasis)}
      />
    </g>
  ) : status === "zero" ? (
    <g aria-label={labels.zero}>
      <SketchedShape
        shape={{ kind: "circle", cx: x + 85, cy: y + 76, r: 10 }}
        profile={tokens.sketch.shape}
        fill="none"
        stroke={tokens.color.inactive}
      />
    </g>
  ) : undefined;
}
