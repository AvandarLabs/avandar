import { SketchedShape } from "../../primitives/SketchedShape";
import { useGraphicTokens } from "../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = {
  siteId: string;
  x: number;
  y: number;
  lift: number;
  accent: string;
  selected: boolean;
};
/**
 * A selected marker rises on a short stem above its unchanged eligible anchor.
 */
export function SiteAnchor({
  siteId,
  x,
  y,
  lift,
  accent,
  selected,
}: Readonly<Props>): ReactNode {
  const tokens = useGraphicTokens();
  return (
    <g>
      {" "}
      <circle
        data-site-anchor={siteId}
        cx={x}
        cy={y}
        r={3}
        fill={tokens.color.inactive}
      />
      <SketchedShape
        shape={{ kind: "line", x1: x, y1: y, x2: x, y2: y - lift }}
        profile={tokens.sketch.shape}
        stroke={accent}
      />
      <circle
        data-raised-site={siteId}
        cx={x}
        cy={y - lift}
        r={selected ? 5 : 3}
        fill={selected ? accent : tokens.color.inactive}
      />
    </g>
  );
}
