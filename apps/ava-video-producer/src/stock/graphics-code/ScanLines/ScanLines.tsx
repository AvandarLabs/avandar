import { Motion } from "../../../motion";
import { GraphicThemeHooks } from "../../theme/GraphicThemeHooks/GraphicThemeHooks";
import { ScanBeam } from "./ScanBeam";
import { ScanDefinitions } from "./ScanDefinitions";
import { ScanHandle } from "./ScanHandle";
import { SCAN_AT, SCAN_FRAMES } from "./ScanLines.constants";
import { ScannedRecords } from "./ScannedRecords";
import type { Props } from "./ScanLines.types";
import type { ReactNode } from "react";

/** Renders ScanLines within the authored stock graphics. */
export function ScanLines({
  input,
  frame,
  accent,
  id,
}: Readonly<Props>): ReactNode {
  const { atomic } = GraphicThemeHooks.useGraphicTheme();
  const { color, stroke, corner, sketch } =
    GraphicThemeHooks.useGraphicTokens();
  const shapes = GraphicThemeHooks.useGraphicShapeScales();
  const motion = GraphicThemeHooks.useGraphicMotion();
  const fields = input.fields;
  const t = motion.ramp(
    frame,
    SCAN_AT,
    motion.scale(SCAN_FRAMES),
    motion.travel.easing,
  );
  const scanY = Motion.mix({
    t,
    from: 138,
    to: 489,
  });
  return (
    <g>
      <ScanDefinitions {...{ accent, id, atomic, corner, shapes }} />
      <ScannedRecords {...{ input, accent, corner, fields, scanY }} />
      <ScanBeam {...{ accent, id, stroke, sketch, shapes, scanY }} />
      <ScanHandle
        {...{
          accent,
          color,
          stroke,
          sketch,
          shapes,
          scanY,
        }}
      />
    </g>
  );
}
