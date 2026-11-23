import { useVideoTheme } from "../../../videoTheme/videoThemeHelpers";
import { type ResultRowData } from "./ResultsPanelShared/ResultsPanelShared.types";
import type { ReactNode } from "react";

type Props = { row: ResultRowData };

/** Pairs a channel name with its formatted result count for `ResultRow`. */
export function ResultRowLabel({ row }: Readonly<Props>): ReactNode {
  const { semantic, mantine } = useVideoTheme();
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        fontSize: mantine.fontSizes["19"],
        marginBottom: mantine.spacing["9"],
      }}
    >
      <span>{row.label}</span>
      <span style={{ color: semantic.color.scene.mutedForeground }}>
        {row.n.toLocaleString("en-US")}
      </span>
    </div>
  );
}
