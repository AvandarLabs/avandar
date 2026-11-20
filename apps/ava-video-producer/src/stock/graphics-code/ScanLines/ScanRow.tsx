import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ScanLinesShared } from "./ScanLinesShared/ScanLinesShared";
import { type ScanRowProps as Props } from "./ScanLinesShared/ScanLinesShared.types";
import { ScanRowCheck } from "./ScanRowCheck";
import { ScanRowPlaceholder } from "./ScanRowPlaceholder";
import type { ReactNode } from "react";
/** One field row: its label, placeholder values, and the check it earns. */
export function ScanRow({
  row,
  index,
  isLast,
  scanY,
  accent,
  showChecks,
}: Props): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const hairline = shapes.stroke(stroke.hairline);
  const y = 178 + index * 55;
  const passed = motion.ramp(scanY, y - 12, ScanLinesShared.ROW_PASS_SPAN);
  return (
    <g>
      <Text role="field" x={184} y={y + 9} size={ScanLinesShared.FIELD_SIZE}>
        {row}
      </Text>
      <ScanRowPlaceholder y={y} index={index} />
      <ScanRowCheck
        y={y}
        passed={passed}
        accent={accent}
        showChecks={showChecks}
      />
      {isLast ? null : (
        <SketchedShape
          shape={{ kind: "path", d: `M176 ${y + 29} H821` }}
          profile={sketch.shape}
          stroke={color.line}
          strokeOpacity={atomic.opacity["60"]}
          strokeWidth={hairline}
        />
      )}
    </g>
  );
}
