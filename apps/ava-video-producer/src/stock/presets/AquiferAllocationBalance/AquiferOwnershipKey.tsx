import { FitText } from "../../primitives/FitText/FitText";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";
/** Inputs for AquiferOwnershipKey. */
type Props = { number: number; x: number; y: number };

/** A stable visible number connects a physical route to its budget entry. */
export function AquiferOwnershipKey({
  number,
  x,
  y,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  const scales = useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: 10 }}
        profile={tokens.sketch.shape}
        data-ownership-key={number}
        fill={tokens.color.ground}
        stroke={tokens.color.inactive}
        strokeWidth={scales.stroke(tokens.stroke.hairline)}
      />
      <FitText
        text={String(number)}
        x={x}
        y={y + 4}
        width={18}
        fontSize={12}
        maxLines={1}
        anchor="middle"
        normalizeWhitespace
      />
    </>
  );
}
