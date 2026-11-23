import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ReactNode } from "react";

type Props = {
  index: number;
  railY: number;
  accent: string;
  selected: boolean;
};
/**
 * Fixed roster keys keep close or coincident site identities separately
 * legible.
 */
export function SiteKey({
  index,
  railY,
  accent,
  selected,
}: Readonly<Props>): ReactNode {
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <g>
      <SketchedShape
        shape={{ kind: "line", x1: 638, y1: railY + 8, x2: 638, y2: railY }}
        profile={tokens.sketch.shape}
        stroke={selected ? accent : tokens.color.inactive}
      />
      <SketchedShape
        shape={{ kind: "circle", cx: 638, cy: railY, r: 9 }}
        profile={tokens.sketch.shape}
        fill={tokens.color.surface}
        stroke={selected ? accent : tokens.color.inactive}
      />
      <text
        x={638}
        y={railY + 4}
        fill={tokens.color.text}
        fontSize={tokens.text.graphic.data.fontSize}
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontWeight={tokens.text.graphic.data.fontWeight}
        textAnchor="middle"
      >
        {index + 1}
      </text>
    </g>
  );
}
