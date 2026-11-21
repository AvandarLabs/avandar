import { StockRect } from "../../../../../../stock/primitives/StockRect";
import { useVideoShapeScales } from "../../../../../../videoTheme/useVideoShapeScales";
import { useVideoTheme } from "../../../../../../videoTheme/videoThemeHelpers";
import { DemoTheme } from "../../../DemoTheme";
import { DIAGRAM_NODE_SIZE } from "../../findDiagramNode";
import type { ReactNode } from "react";

type Props = {
  x: number;
  y: number;
  label: string;
};

/** One labelled node of the preview diagram. */
export function DiagramNode({ x, y, label }: Readonly<Props>): ReactNode {
  const { semantic, mantine, atomic } = useVideoTheme();
  const scales = useVideoShapeScales();
  const colors = DemoTheme.useDemoColors();
  return (
    <g
      transform={`translate(${x - DIAGRAM_NODE_SIZE.width / 2} ${y - DIAGRAM_NODE_SIZE.height / 2})`}
    >
      <StockRect
        width={DIAGRAM_NODE_SIZE.width}
        height={DIAGRAM_NODE_SIZE.height}
        rx={scales.corner(semantic.corner.label)}
        fill={colors.panel}
        stroke={colors.brand}
        strokeWidth={scales.stroke(semantic.stroke.default)}
      />
      <text
        x={DIAGRAM_NODE_SIZE.width / 2}
        y={DIAGRAM_NODE_SIZE.height / 2 + 7}
        textAnchor="middle"
        fill={colors.text}
        fontSize={mantine.fontSizes["2xl"]}
        fontWeight={atomic.fontWeight.semibold}
      >
        {label}
      </text>
    </g>
  );
}
