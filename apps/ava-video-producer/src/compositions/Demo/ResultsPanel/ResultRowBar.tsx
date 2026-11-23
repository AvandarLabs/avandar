import { Motion } from "../../../motion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { type ResultRowData } from "./ResultsPanelShared/ResultsPanelShared.types";
import type { ReactNode } from "react";

type Props = {
  row: ResultRowData;
  grow: number;
  cut: number;
};
/** Grows a channel's value bar and retracts it when excluded in `ResultRow`. */
export function ResultRowBar({ row, grow, cut }: Readonly<Props>): ReactNode {
  const { semantic } = useVideoTheme();
  const scales = useVideoShapeScales();
  const pill = scales.corner(semantic.corner.pill);
  // scaleX, not width. Width relayouts every frame; a transform composites and
  // cannot shimmer the row.
  return (
    <div
      style={{
        height: 10,
        borderRadius: pill,
        background: semantic.color.scene.muted,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${row.bar * 100}%`,
          borderRadius: pill,
          background: semantic.color.scene.brand,
          transformOrigin: "left center",
          transform: `scaleX(${(
            grow *
            Motion.mix({
              t: cut,
              from: 1,
              to: 0,
            })
          ).toFixed(4)})`,
        }}
      />
    </div>
  );
}
