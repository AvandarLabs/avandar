import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { getCoordinationPlaceColorFromIndex } from "../getCoordinationPlaceColorFromIndex";
import type { ReactNode } from "react";
/** The open place's letter in a ring of its place colour. */
export function OpenPlaceKey({
  index,
  x,
  accent,
}: Readonly<{ index: number; x: number; accent: string }>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const color = getCoordinationPlaceColorFromIndex({
    index,
    accent,
    color: tokens.color,
  });
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: 82, r: 9 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={color}
      />
      <text
        data-open-place-key
        x={x}
        y={86}
        textAnchor="middle"
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        fontSize={tokens.text.graphic.data.fontSize}
        fill={color}
      >
        {String.fromCharCode(65 + index)}
      </text>
    </>
  );
}
