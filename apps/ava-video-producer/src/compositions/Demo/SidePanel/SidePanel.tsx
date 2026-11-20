import { abs } from "../../../chrome/abs";
import { useVideoMotion } from "../../../videoTheme/useVideoMotion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { ROWS_AT, SIDE } from "../timeline";
import { Facts } from "./Facts";
import { FilterChips } from "./FilterChips";
import { MatchedCount } from "./MatchedCount";
import { PublishedToast } from "./PublishedToast";
import { SidePanelShared } from "./SidePanelShared/SidePanelShared";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  shown: number;
  refilter: number;
  chipOn: number;
};
/** The panel's starting scale as it arrives. */
const PANEL_START_SCALE = 0.985;
/**
 * The side panel phase: the matched-rows counter, the filter chips, a pair
 * of supporting facts, and the publish toast that lands once the report
 * is shared.
 */
export function SidePanel({
  frame,
  shown,
  refilter,
  chipOn,
}: Readonly<Props>): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  const motion = useVideoMotion();
  const scales = useVideoShapeScales();
  const scene = semantic.color.scene;
  return (
    <div
      style={{
        ...abs(SIDE),
        borderRadius: scales.corner(semantic.corner.scene),
        border: `${scales.stroke(semantic.stroke.hairline)}px solid ${scene.border}`,
        background: scene.card,
        padding: mantine.spacing["28"],
        ...motion.enter(frame, ROWS_AT + SidePanelShared.CUES.panel, {
          dur: motion.sheet,
          y: SidePanelShared.RISE.panel,
          scale: PANEL_START_SCALE,
        }),
      }}
    >
      <div
        style={{ fontSize: mantine.fontSizes.sm, color: scene.mutedForeground }}
      >
        ROWS MATCHED
      </div>
      <MatchedCount shown={shown} />
      <FilterChips frame={frame} chipOn={chipOn} />
      <Facts frame={frame} refilter={refilter} />
      <PublishedToast frame={frame} />
    </div>
  );
}
