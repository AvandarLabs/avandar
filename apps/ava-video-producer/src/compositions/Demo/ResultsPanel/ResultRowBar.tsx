import { mix } from "../../../motion";
import { useVideoShapeScales } from "../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../videoTheme/useVideoTheme";
import { type ResultRowData } from "./ResultsPanelShared/ResultsPanelShared.types";
import type { ReactNode } from "react";
/** Grows a channel's value bar and retracts it when excluded in `ResultRow`. */
export function ResultRowBar({
  row,
  grow,
  cut,
}: {
  row: ResultRowData;
  grow: number;
  cut: number;
}): ReactNode {
  const { semantic } = useVideoTheme();
  const scales = useVideoShapeScales();
  const pill = scales.corner(semantic.corner.pill);
  return (
    <div
      style={{
        height: 10,
        borderRadius: pill,
        background: semantic.color.scene.muted,
        overflow: "hidden",
      }}
    >
      {/* scaleX, not width. Width relayouts every frame; a transform
       * composites and cannot shimmer the row. */}
      <div
        style={{
          height: "100%",
          width: `${row.bar * 100}%`,
          borderRadius: pill,
          background: semantic.color.scene.brand,
          transformOrigin: "left center",
          transform: `scaleX(${(grow * mix(cut, 1, 0)).toFixed(4)})`,
        }}
      />
    </div>
  );
}
