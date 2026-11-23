import { Check } from "../../graphics-common/Check";
import { SketchedShape } from "../../primitives/SketchedShape";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { ScanLinesInput } from "../../presets/ScanLines/ScanLines.schema";
import type { ReactNode } from "react";

type Props = {
  y: number;
  passed: number;
  accent: string;
  showChecks: ScanLinesInput["showChecks"];
};
/** The row's check circle, filling and ticking once the scan has passed. */
export function ScanRowCheck({
  y,
  passed,
  accent,
  showChecks,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { stroke, sketch } = GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  return (
    <>
      <SketchedShape
        shape={{ kind: "circle", cx: 795, cy: y + 2, r: 11 }}
        profile={sketch.shape}
        fill={accent}
        fillOpacity={passed * shapes.wash(atomic.opacity["12"])}
        stroke={accent}
        strokeOpacity={atomic.opacity["15"] + passed * atomic.opacity["60"]}
        strokeWidth={shapes.stroke(stroke.hairline)}
      />
      <g opacity={passed}>
        {showChecks ? (
          <Check x={795} y={y + 2} color={accent} size={9} />
        ) : null}
      </g>
    </>
  );
}
