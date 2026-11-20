import { SketchedShape } from "../../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { CandidateAnchorGuidesShared } from "./CandidateAnchorGuidesShared/CandidateAnchorGuidesShared";
import type { ReactNode } from "react";

type Props = {
  labelId: string;
  x: number;
  y: number;
  index: number;
  color: string;
};
/** A label's anchor ring and its dotted or dashed callout to its row. */
export function LabelCallout({
  labelId,
  x,
  y,
  index,
  color,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  return (
    <>
      <g data-label-anchor={labelId}>
        <SketchedShape
          shape={{ kind: "circle", cx: x, cy: y, r: 6 + index * 4 }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={color}
        />
      </g>
      <g data-label-callout={labelId}>
        <SketchedShape
          shape={{
            kind: "path",
            d: `M${x} ${y} H${478 + index * 14} V${225 + index * 95} H540`,
          }}
          profile={tokens.sketch.shape}
          fill="none"
          stroke={color}
          strokeOpacity={tokens.alpha.guide}
          strokeDasharray={
            index === 0
              ? atomic.dash.dotted.join(" ")
              : CandidateAnchorGuidesShared.SECOND_CALLOUT_DASH
          }
        />
      </g>
    </>
  );
}
