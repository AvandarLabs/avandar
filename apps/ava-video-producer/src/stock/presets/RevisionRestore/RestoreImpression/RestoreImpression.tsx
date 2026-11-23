import { Motion } from "../../../../motion";
import { StockRect } from "../../../primitives/StockRect";
import { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { RestoredContentLines } from "./RestoredContentLines";
import type { Input } from "../RevisionRestore.schema";
import type { ReactNode } from "react";

type Props = {
  revision: Input["revisions"][number];
  index: number;
  frame: number;
  accent: string;
};

type ImpressionBoundsOptions = {
  index: Readonly<Props>["index"];
  progress: number;
};

type ImpressionBoundsResult = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** The dash of a restore impression's outline. */
const IMPRESSION_DASH = "8 5";

/** Samples the authored restore impression drawing bounds. */
function _getRestoreImpressionBounds({
  index,
  progress,
}: Readonly<ImpressionBoundsOptions>): ImpressionBoundsResult {
  return {
    x: Motion.mix({
      t: progress,
      from: 40 + index * 225,
      to: 270,
    }),
    y: Motion.mix({
      t: progress,
      from: 382,
      to: 140,
    }),
    width: Motion.mix({
      t: progress,
      from: 205,
      to: 420,
    }),
    height: Motion.mix({
      t: progress,
      from: 190,
      to: 200,
    }),
  };
}

/** A copy lifts from its retained snapshot and aligns over current contents. */
export function RestoreImpression({
  revision,
  index,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const tokens = GraphicThemeHooks.useGraphicTokens();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const scales = GraphicThemeHooks.useGraphicShapeScales();
  const progress = motion.ramp(frame, 60, motion.hero, motion.travel.easing);
  return (
    <g
      data-restoring-id={revision.id}
      opacity={
        motion.ramp(frame, 56, motion.whip) *
        (1 - motion.ramp(frame, 112, motion.scale(14)))
      }
    >
      <StockRect
        {..._getRestoreImpressionBounds({ index, progress })}

        rx={scales.corner(tokens.corner.cell)}
        fill={tokens.color.surface}
        fillOpacity={scales.wash(atomic.opacity["22"])}
        stroke={accent}
        strokeWidth={scales.stroke(tokens.stroke.default)}
        strokeDasharray={IMPRESSION_DASH}
      />
      <RestoredContentLines
        revision={revision}
        index={index}
        accent={accent}
        progress={progress}
      />
    </g>
  );
}
